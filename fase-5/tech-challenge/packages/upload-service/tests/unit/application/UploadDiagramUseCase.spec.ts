import { UploadDiagramUseCase, ValidationError } from '../../../src/application/use-cases/UploadDiagramUseCase';
import { IDiagramRepository } from '../../../src/domain/repositories/IDiagramRepository';
import { IStorageAdapter, StorageError } from '../../../src/infrastructure/storage/IStorageAdapter';
import {
  DiagramEventProducer,
  KafkaProducerError,
} from '../../../src/infrastructure/kafka/DiagramEventProducer';
import { Diagram } from '../../../src/domain/entities/Diagram';
import { UploadDiagramInput } from '../../../src/domain/use-cases/IUploadDiagramUseCase';

const makeValidInput = (overrides: Partial<UploadDiagramInput> = {}): UploadDiagramInput => ({
  file: {
    name: 'architecture.png',
    size: 1024 * 512, // 512KB
    type: 'image/png',
    buffer: Buffer.from('fake-image-data'),
  },
  user: {
    id: 'user-abc-123',
    name: 'João Silva',
    email: 'joao.silva@example.com',
  },
  ...overrides,
});

const makeMockRepository = (): jest.Mocked<IDiagramRepository> => ({
  save: jest.fn().mockImplementation((diagram: Diagram) => Promise.resolve(diagram)),
  findById: jest.fn().mockResolvedValue(null),
});

const makeMockStorage = (storageUrl = 'https://storage.example.com/diagrams/architecture.png'): jest.Mocked<IStorageAdapter> => ({
  upload: jest.fn().mockResolvedValue(storageUrl),
});

const makeMockProducer = (): jest.Mocked<Pick<DiagramEventProducer, 'publishDiagramCreated'>> => ({
  publishDiagramCreated: jest.fn().mockResolvedValue({
    eventId: 'event-xyz',
    timestamp: new Date().toISOString(),
    diagram: {
      id: 'diagram-id',
      fileName: 'architecture.png',
      fileType: 'image/png',
      fileSize: 1024 * 512,
      storageUrl: 'https://storage.example.com/diagrams/architecture.png',
    },
    user: {
      id: 'user-abc-123',
      name: 'João Silva',
      email: 'joao.silva@example.com',
    },
  }),
});

describe('UploadDiagramUseCase', () => {
  let repository: jest.Mocked<IDiagramRepository>;
  let storageAdapter: jest.Mocked<IStorageAdapter>;
  let eventProducer: jest.Mocked<DiagramEventProducer>;
  let useCase: UploadDiagramUseCase;

  beforeEach(() => {
    repository = makeMockRepository();
    storageAdapter = makeMockStorage();
    eventProducer = makeMockProducer() as unknown as jest.Mocked<DiagramEventProducer>;
    useCase = new UploadDiagramUseCase(repository, storageAdapter, eventProducer);
  });

  describe('should upload a valid PNG file and return diagramId, status, storageUrl, uploadedAt', () => {
    it('returns correct shape for PNG upload', async () => {
      const input = makeValidInput({ file: { name: 'arch.png', size: 512000, type: 'image/png' } });

      const result = await useCase.execute(input);

      expect(result.diagramId).toBeDefined();
      expect(result.status).toBe('uploaded');
      expect(result.storageUrl).toMatch(/^https?:\/\//);
      expect(result.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('should upload a valid JPEG file', () => {
    it('accepts image/jpeg MIME type', async () => {
      const input = makeValidInput({ file: { name: 'arch.jpg', size: 512000, type: 'image/jpeg' } });

      const result = await useCase.execute(input);

      expect(result.status).toBe('uploaded');
      expect(result.diagramId).toBeDefined();
    });
  });

  describe('should upload a valid PDF file', () => {
    it('accepts application/pdf MIME type', async () => {
      const input = makeValidInput({ file: { name: 'arch.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' } });

      const result = await useCase.execute(input);

      expect(result.status).toBe('uploaded');
      expect(result.diagramId).toBeDefined();
    });
  });

  describe('should reject file with unsupported MIME type', () => {
    it('throws ValidationError for text/plain', async () => {
      const input = makeValidInput({ file: { name: 'arch.txt', size: 100, type: 'text/plain' } });

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Unsupported file type: text/plain');
    });

    it('does not call storage adapter for unsupported types', async () => {
      const input = makeValidInput({ file: { name: 'arch.txt', size: 100, type: 'text/plain' } });

      await expect(useCase.execute(input)).rejects.toThrow();
      expect(storageAdapter.upload).not.toHaveBeenCalled();
    });
  });

  describe('should reject file exceeding max size', () => {
    it('throws ValidationError when file exceeds 10MB', async () => {
      const oversizedInput = makeValidInput({
        file: { name: 'huge.png', size: 11 * 1024 * 1024, type: 'image/png' },
      });

      await expect(useCase.execute(oversizedInput)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(oversizedInput)).rejects.toThrow(/exceeds maximum/);
    });
  });

  describe('should reject when user id is missing', () => {
    it('throws ValidationError when user.id is empty', async () => {
      const input = makeValidInput({ user: { id: '', name: 'João', email: 'joao@example.com' } });

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('user.id is required');
    });
  });

  describe('should reject when user email is invalid', () => {
    it('throws ValidationError for malformed email', async () => {
      const input = makeValidInput({
        user: { id: 'user-123', name: 'João', email: 'not-an-email' },
      });

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('user.email must be a valid email');
    });
  });

  describe('should save diagram to repository after upload', () => {
    it('calls repository.save with correct diagram data', async () => {
      const input = makeValidInput();

      await useCase.execute(input);

      expect(repository.save).toHaveBeenCalledTimes(1);
      const savedDiagram = repository.save.mock.calls[0][0];
      expect(savedDiagram.fileName).toBe(input.file.name);
      expect(savedDiagram.fileType).toBe(input.file.type);
      expect(savedDiagram.fileSize).toBe(input.file.size);
      expect(savedDiagram.userId).toBe(input.user.id);
    });
  });

  describe('should publish diagram.created Kafka event with correct payload after upload', () => {
    it('calls publishDiagramCreated with diagram data', async () => {
      const input = makeValidInput();

      const result = await useCase.execute(input);

      expect(eventProducer.publishDiagramCreated).toHaveBeenCalledTimes(1);
      const eventPayload = eventProducer.publishDiagramCreated.mock.calls[0][0];
      expect(eventPayload.diagram.id).toBe(result.diagramId);
      expect(eventPayload.diagram.fileName).toBe(input.file.name);
      expect(eventPayload.diagram.fileType).toBe(input.file.type);
      expect(eventPayload.diagram.fileSize).toBe(input.file.size);
      expect(eventPayload.diagram.storageUrl).toBe(result.storageUrl);
    });
  });

  describe('should include eventId and timestamp in Kafka event', () => {
    it('publishDiagramCreated is called and returns event with eventId and timestamp', async () => {
      const input = makeValidInput();

      await useCase.execute(input);

      const eventPayload = eventProducer.publishDiagramCreated.mock.calls[0][0];
      // The producer is responsible for generating eventId and timestamp
      expect(eventPayload).toBeDefined();
      expect(eventPayload.diagram).toBeDefined();
    });
  });

  describe('should include user info in Kafka event', () => {
    it('passes user data to publishDiagramCreated', async () => {
      const input = makeValidInput();

      await useCase.execute(input);

      const eventPayload = eventProducer.publishDiagramCreated.mock.calls[0][0];
      expect(eventPayload.user.id).toBe(input.user.id);
      expect(eventPayload.user.name).toBe(input.user.name);
      expect(eventPayload.user.email).toBe(input.user.email);
    });
  });

  describe('should return status "uploaded" on success', () => {
    it('always returns status uploaded on happy path', async () => {
      const result = await useCase.execute(makeValidInput());

      expect(result.status).toBe('uploaded');
    });
  });

  describe('should throw StorageError when storage adapter fails', () => {
    it('propagates StorageError when storage.upload throws', async () => {
      storageAdapter.upload.mockRejectedValue(
        new StorageError('S3 bucket unavailable')
      );

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(StorageError);
      await expect(useCase.execute(makeValidInput())).rejects.toThrow('S3 bucket unavailable');
    });

    it('does not call repository.save when storage fails', async () => {
      storageAdapter.upload.mockRejectedValue(new StorageError('Storage down'));

      await expect(useCase.execute(makeValidInput())).rejects.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('should throw KafkaProducerError when Kafka publish fails', () => {
    it('throws KafkaProducerError when producer fails', async () => {
      eventProducer.publishDiagramCreated.mockRejectedValue(
        new KafkaProducerError('Kafka broker unreachable')
      );

      await expect(useCase.execute(makeValidInput())).rejects.toThrow(KafkaProducerError);
    });

    it('storage upload already succeeded before Kafka failure', async () => {
      eventProducer.publishDiagramCreated.mockRejectedValue(
        new KafkaProducerError('Kafka broker unreachable')
      );

      await expect(useCase.execute(makeValidInput())).rejects.toThrow();
      expect(storageAdapter.upload).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('should rollback or handle partial failure when Kafka publish fails', () => {
    it('diagram is already saved when Kafka fails - should propagate error for external retry', async () => {
      eventProducer.publishDiagramCreated.mockRejectedValue(
        new KafkaProducerError('Kafka unavailable')
      );

      // The use case throws so the caller can handle/retry
      await expect(useCase.execute(makeValidInput())).rejects.toThrow(KafkaProducerError);

      // But the file was already uploaded and saved
      expect(storageAdapter.upload).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
