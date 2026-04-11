import { ProcessDiagramUseCase } from '../../../src/application/use-cases/ProcessDiagramUseCase';
import { IProcessingJobRepository } from '../../../src/domain/repositories/IProcessingJobRepository';
import {
  IDiagramExtractionAgentClient,
  ExtractionAgentInput,
  ExtractionAgentOutput,
  AgentTimeoutError,
} from '../../../src/infrastructure/agents/DiagramExtractionAgentClient';
import { ITextractAdapter } from '../../../src/infrastructure/textract/TextractAdapter';
import { DiagramProcessedProducer } from '../../../src/infrastructure/kafka/DiagramProcessedProducer';
import { DiagramCreatedEvent } from '../../../src/domain/use-cases/IProcessDiagramUseCase';
import { ProcessingJob } from '../../../src/domain/entities/ProcessingJob';

const makeDiagramCreatedEvent = (overrides: Partial<DiagramCreatedEvent> = {}): DiagramCreatedEvent => ({
  eventId: 'event-source-001',
  timestamp: '2024-01-15T10:00:00.000Z',
  diagram: {
    id: 'diagram-abc-123',
    fileName: 'microservices.png',
    fileType: 'image/png',
    fileSize: 512000,
    storageUrl: 'https://arch-bucket.s3.us-east-1.amazonaws.com/microservices.png',
  },
  user: {
    id: 'user-xyz-456',
    name: 'Carlos Mendes',
    email: 'carlos@example.com',
  },
  ...overrides,
});

const makeSuccessfulAgentOutput = (overrides: Partial<ExtractionAgentOutput> = {}): ExtractionAgentOutput => ({
  diagramId: 'diagram-abc-123',
  status: 'processed',
  extractedText: 'API Gateway -> Auth Service -> User DB',
  elements: [
    {
      id: 'el-1',
      label: 'API Gateway',
      type: 'microservice',
      confidence: 0.95,
      boundingBox: { x: 10, y: 20, width: 100, height: 50 },
    },
    {
      id: 'el-2',
      label: 'User DB',
      type: 'database',
      confidence: 0.88,
      boundingBox: { x: 200, y: 100, width: 80, height: 60 },
    },
  ],
  connections: [
    { fromElementId: 'el-1', toElementId: 'el-2', type: 'sync', label: 'query' },
  ],
  ...overrides,
});

const makeMockRepository = (): jest.Mocked<IProcessingJobRepository> => ({
  save: jest.fn().mockImplementation((job: ProcessingJob) => Promise.resolve(job)),
  findById: jest.fn().mockResolvedValue(null),
  findByDiagramId: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockImplementation((job: ProcessingJob) => Promise.resolve(job)),
});

const makeMockTextractAdapter = (extractedText = 'API Gateway User DB'): jest.Mocked<ITextractAdapter> => ({
  extractText: jest.fn().mockResolvedValue(extractedText),
});

const makeMockAgentClient = (output = makeSuccessfulAgentOutput()): jest.Mocked<IDiagramExtractionAgentClient> => ({
  extract: jest.fn().mockResolvedValue(output),
});

const makeMockProducer = (): jest.Mocked<Pick<DiagramProcessedProducer, 'publishDiagramProcessed'>> => ({
  publishDiagramProcessed: jest.fn().mockResolvedValue({
    eventId: 'event-processed-999',
    timestamp: new Date().toISOString(),
    diagram: {
      id: 'diagram-abc-123',
      fileName: 'microservices.png',
      fileType: 'image/png',
      storageUrl: 'https://arch-bucket.s3.us-east-1.amazonaws.com/microservices.png',
    },
    processing: { status: 'processed', extractedText: 'text', elements: [] },
  }),
});

describe('ProcessDiagramUseCase', () => {
  let repository: jest.Mocked<IProcessingJobRepository>;
  let textractAdapter: jest.Mocked<ITextractAdapter>;
  let agentClient: jest.Mocked<IDiagramExtractionAgentClient>;
  let producer: jest.Mocked<DiagramProcessedProducer>;
  let useCase: ProcessDiagramUseCase;

  beforeEach(() => {
    repository = makeMockRepository();
    textractAdapter = makeMockTextractAdapter();
    agentClient = makeMockAgentClient();
    producer = makeMockProducer() as unknown as jest.Mocked<DiagramProcessedProducer>;
    useCase = new ProcessDiagramUseCase(repository, textractAdapter, agentClient, producer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should call Textract before diagram-extraction-agent', () => {
    it('calls textractAdapter.extractText with the storageUrl', async () => {
      const event = makeDiagramCreatedEvent();

      await useCase.execute(event);

      expect(textractAdapter.extractText).toHaveBeenCalledTimes(1);
      expect(textractAdapter.extractText).toHaveBeenCalledWith(event.diagram.storageUrl);
    });

    it('calls agent after textract', async () => {
      const callOrder: string[] = [];
      textractAdapter.extractText.mockImplementation(async () => {
        callOrder.push('textract');
        return 'raw text';
      });
      agentClient.extract.mockImplementation(async () => {
        callOrder.push('agent');
        return makeSuccessfulAgentOutput();
      });

      await useCase.execute(makeDiagramCreatedEvent());

      expect(callOrder).toEqual(['textract', 'agent']);
    });
  });

  describe('should pass extractedText from Textract to agent', () => {
    it('passes textract output as extractedText in agent input', async () => {
      textractAdapter.extractText.mockResolvedValue('API Gateway User Service MongoDB');

      await useCase.execute(makeDiagramCreatedEvent());

      const agentInput: ExtractionAgentInput = agentClient.extract.mock.calls[0][0];
      expect(agentInput.extractedText).toBe('API Gateway User Service MongoDB');
    });
  });

  describe('should proceed without extractedText when Textract fails', () => {
    it('still calls agent with empty extractedText when textract throws', async () => {
      textractAdapter.extractText.mockRejectedValue(new Error('InvalidS3ObjectException'));

      await useCase.execute(makeDiagramCreatedEvent());

      expect(agentClient.extract).toHaveBeenCalledTimes(1);
      const agentInput: ExtractionAgentInput = agentClient.extract.mock.calls[0][0];
      expect(agentInput.extractedText).toBe('');
    });
  });

  describe('should process diagram.created event and invoke diagram-extraction-agent', () => {
    it('calls agentClient.extract when processing event', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      expect(agentClient.extract).toHaveBeenCalledTimes(1);
    });
  });

  describe('should pass storageUrl and fileType to extraction agent', () => {
    it('passes diagram storageUrl and fileType in agent input', async () => {
      const event = makeDiagramCreatedEvent();

      await useCase.execute(event);

      const agentInput: ExtractionAgentInput = agentClient.extract.mock.calls[0][0];
      expect(agentInput.diagram.storageUrl).toBe(event.diagram.storageUrl);
      expect(agentInput.diagram.fileType).toBe(event.diagram.fileType);
      expect(agentInput.diagram.id).toBe(event.diagram.id);
    });
  });

  describe('should set options detectText, detectShapes, detectConnections to true', () => {
    it('sends options with all detection flags enabled', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const agentInput: ExtractionAgentInput = agentClient.extract.mock.calls[0][0];
      expect(agentInput.options.detectText).toBe(true);
      expect(agentInput.options.detectShapes).toBe(true);
      expect(agentInput.options.detectConnections).toBe(true);
    });

    it('sends language as pt-BR', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const agentInput: ExtractionAgentInput = agentClient.extract.mock.calls[0][0];
      expect(agentInput.options.language).toBe('pt-BR');
    });
  });

  describe('should publish diagram.processed event with extracted elements on success', () => {
    it('published event includes elements from agent output', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.elements).toHaveLength(2);
      expect(publishPayload.processing.elements![0].label).toBe('API Gateway');
      expect(publishPayload.processing.elements![0].type).toBe('microservice');
      expect(publishPayload.processing.elements![1].label).toBe('User DB');
      expect(publishPayload.processing.elements![1].type).toBe('database');
    });
  });

  describe('should publish diagram.processed event with status "processed" on success', () => {
    it('processing.status is "processed" when agent succeeds', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('processed');
    });
  });

  describe('should publish diagram.processed event with status "failed" when agent returns error', () => {
    it('sets status "failed" when agent output has status failed', async () => {
      agentClient.extract.mockResolvedValue(
        makeSuccessfulAgentOutput({
          status: 'failed',
          error: { code: 'EXTRACTION_ERROR', message: 'Could not parse diagram' },
        })
      );

      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('failed');
    });
  });

  describe('should save processing job to repository', () => {
    it('calls repository.save with processing job', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      expect(repository.save).toHaveBeenCalledTimes(1);
      const savedJob: ProcessingJob = repository.save.mock.calls[0][0];
      expect(savedJob.diagramId).toBe('diagram-abc-123');
    });

    it('calls repository.update after processing completes', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      expect(repository.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('should include elements with type and label in published event', () => {
    it('each element in published event has type, label, and position', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      for (const element of publishPayload.processing.elements!) {
        expect(element).toHaveProperty('type');
        expect(element).toHaveProperty('label');
        expect(element).toHaveProperty('position');
      }
    });
  });

  describe('should include extractedText in published event', () => {
    it('published event contains extractedText from agent', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.extractedText).toBe('API Gateway -> Auth Service -> User DB');
    });
  });

  describe('should handle agent timeout gracefully and publish failed event', () => {
    it('publishes failed event when agent throws AgentTimeoutError', async () => {
      agentClient.extract.mockRejectedValue(
        new AgentTimeoutError('Diagram extraction agent timed out after 30000ms')
      );

      await useCase.execute(makeDiagramCreatedEvent());

      expect(producer.publishDiagramProcessed).toHaveBeenCalledTimes(1);
      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('failed');
      expect(publishPayload.error?.code).toBe('AGENT_TIMEOUT');
    });

    it('saves job with failed status on timeout', async () => {
      agentClient.extract.mockRejectedValue(new AgentTimeoutError('timeout'));

      await useCase.execute(makeDiagramCreatedEvent());

      expect(repository.update).toHaveBeenCalledTimes(1);
      const updatedJob: ProcessingJob = repository.update.mock.calls[0][0];
      expect(updatedJob.status).toBe('failed');
    });
  });

  describe('should handle malformed diagram.created event (missing diagramId)', () => {
    it('publishes failed event when diagram.id is missing', async () => {
      const malformedEvent = {
        eventId: 'event-bad',
        timestamp: '2024-01-15T10:00:00.000Z',
        diagram: {
          id: '',
          fileName: 'arch.png',
          fileType: 'image/png',
          fileSize: 0,
          storageUrl: '',
        },
        user: { id: 'user-1', name: 'User', email: 'user@example.com' },
      } as DiagramCreatedEvent;

      await useCase.execute(malformedEvent);

      expect(agentClient.extract).not.toHaveBeenCalled();
      expect(producer.publishDiagramProcessed).toHaveBeenCalledTimes(1);
      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('failed');
      expect(publishPayload.error?.code).toBe('INVALID_EVENT');
    });
  });

  describe('should handle agent returning empty elements array', () => {
    it('publishes processed event with empty elements array', async () => {
      agentClient.extract.mockResolvedValue(
        makeSuccessfulAgentOutput({ elements: [], extractedText: 'No elements detected' })
      );

      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('processed');
      expect(publishPayload.processing.elements).toEqual([]);
    });
  });

  describe('should generate new eventId for diagram.processed event', () => {
    it('producer is called with diagram data from source event', async () => {
      const sourceEvent = makeDiagramCreatedEvent();

      await useCase.execute(sourceEvent);

      expect(producer.publishDiagramProcessed).toHaveBeenCalledTimes(1);
      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload).toBeDefined();
    });
  });

  describe('should set diagram info from source event in published payload', () => {
    it('diagram info matches the source event diagram', async () => {
      const event = makeDiagramCreatedEvent();

      await useCase.execute(event);

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.diagram.id).toBe(event.diagram.id);
      expect(publishPayload.diagram.fileName).toBe(event.diagram.fileName);
      expect(publishPayload.diagram.fileType).toBe(event.diagram.fileType);
      expect(publishPayload.diagram.storageUrl).toBe(event.diagram.storageUrl);
    });
  });
});
