import { ProcessDiagramUseCase } from '../../../src/application/use-cases/ProcessDiagramUseCase';
import { IProcessingJobRepository } from '../../../src/domain/repositories/IProcessingJobRepository';
import { ITextractAdapter } from '../../../src/infrastructure/textract/TextractAdapter';
import { DiagramProcessedProducer } from '../../../src/infrastructure/redis/DiagramProcessedProducer';
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

const makeMockRepository = (): jest.Mocked<IProcessingJobRepository> => ({
  save: jest.fn().mockImplementation((job: ProcessingJob) => Promise.resolve(job)),
  findById: jest.fn().mockResolvedValue(null),
  findByDiagramId: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockImplementation((job: ProcessingJob) => Promise.resolve(job)),
});

const makeMockTextractAdapter = (extractedText = 'API Gateway User DB'): jest.Mocked<ITextractAdapter> => ({
  extractText: jest.fn().mockResolvedValue(extractedText),
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
    processing: { status: 'processed', extractedText: 'API Gateway User DB', elements: [], connections: [] },
  }),
});

describe('ProcessDiagramUseCase', () => {
  let repository: jest.Mocked<IProcessingJobRepository>;
  let textractAdapter: jest.Mocked<ITextractAdapter>;
  let producer: jest.Mocked<DiagramProcessedProducer>;
  let useCase: ProcessDiagramUseCase;

  beforeEach(() => {
    repository = makeMockRepository();
    textractAdapter = makeMockTextractAdapter();
    producer = makeMockProducer() as unknown as jest.Mocked<DiagramProcessedProducer>;
    useCase = new ProcessDiagramUseCase(repository, textractAdapter, producer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should call Textract to extract text from diagram', () => {
    it('calls textractAdapter.extractText with the storageUrl', async () => {
      const event = makeDiagramCreatedEvent();

      await useCase.execute(event);

      expect(textractAdapter.extractText).toHaveBeenCalledTimes(1);
      expect(textractAdapter.extractText).toHaveBeenCalledWith(event.diagram.storageUrl);
    });
  });

  describe('should publish diagram.processed with extractedText from Textract', () => {
    it('published event contains extractedText from Textract', async () => {
      textractAdapter.extractText.mockResolvedValue('API Gateway -> Auth Service -> User DB');

      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.extractedText).toBe('API Gateway -> Auth Service -> User DB');
    });

    it('published event has empty elements and connections arrays', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.elements).toEqual([]);
      expect(publishPayload.processing.connections).toEqual([]);
    });
  });

  describe('should publish diagram.processed event with status "processed" on success', () => {
    it('processing.status is "processed" when Textract succeeds', async () => {
      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('processed');
    });
  });

  describe('should proceed without extractedText when Textract fails', () => {
    it('publishes processed event with empty extractedText when Textract throws', async () => {
      textractAdapter.extractText.mockRejectedValue(new Error('InvalidS3ObjectException'));

      await useCase.execute(makeDiagramCreatedEvent());

      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('processed');
      expect(publishPayload.processing.extractedText).toBe('');
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

      expect(textractAdapter.extractText).not.toHaveBeenCalled();
      expect(producer.publishDiagramProcessed).toHaveBeenCalledTimes(1);
      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('failed');
      expect(publishPayload.error?.code).toBe('INVALID_EVENT');
    });
  });

  describe('should skip duplicate diagram.created events', () => {
    it('skips processing when a non-failed job already exists', async () => {
      const existingJob = new ProcessingJob({ diagramId: 'diagram-abc-123', status: 'processed' });
      repository.findByDiagramId.mockResolvedValue(existingJob);

      await useCase.execute(makeDiagramCreatedEvent());

      expect(textractAdapter.extractText).not.toHaveBeenCalled();
      expect(producer.publishDiagramProcessed).not.toHaveBeenCalled();
    });
  });

  describe('should publish failed event when an unexpected error occurs', () => {
    it('publishes failed event when repository.save throws', async () => {
      repository.save.mockRejectedValue(new Error('DB connection refused'));

      await useCase.execute(makeDiagramCreatedEvent());

      expect(producer.publishDiagramProcessed).toHaveBeenCalledTimes(1);
      const publishPayload = producer.publishDiagramProcessed.mock.calls[0][0];
      expect(publishPayload.processing.status).toBe('failed');
      expect(publishPayload.error?.code).toBe('PROCESSING_ERROR');
    });
  });
});
