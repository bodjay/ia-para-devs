import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Diagram, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../../domain/entities/Diagram';
import { IDiagramRepository } from '../../domain/repositories/IDiagramRepository';
import {
  IUploadDiagramUseCase,
  UploadDiagramInput,
  UploadDiagramOutput,
} from '../../domain/use-cases/IUploadDiagramUseCase';
import { IStorageAdapter } from '../../infrastructure/storage/IStorageAdapter';
import {
  DiagramEventProducer,
  StreamProducerError,
} from '../../infrastructure/redis/DiagramEventProducer';

const userSchema = z.object({
  id: z.string().min(1, 'user.id is required'),
  name: z.string().min(1, 'user.name is required'),
  email: z.string().email('user.email must be a valid email'),
});

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UploadDiagramUseCase implements IUploadDiagramUseCase {
  constructor(
    private readonly repository: IDiagramRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly eventProducer: DiagramEventProducer
  ) {}

  async execute(input: UploadDiagramInput): Promise<UploadDiagramOutput> {
    const userValidation = userSchema.safeParse(input.user);
    if (!userValidation.success) {
      throw new ValidationError(userValidation.error.errors[0].message);
    }

    if (!SUPPORTED_FILE_TYPES.includes(input.file.type as any)) {
      throw new ValidationError(
        `Unsupported file type: ${input.file.type}. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
      );
    }

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size ${input.file.size} exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`
      );
    }

    const storageUrl = await this.storageAdapter.upload({
      name: input.file.name,
      size: input.file.size,
      type: input.file.type,
      buffer: input.file.buffer,
      path: input.file.path,
    });

    const diagram = new Diagram({
      id: uuidv4(),
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      storageUrl,
      userId: input.user.id,
    });

    await this.repository.save(diagram);

    try {
      await this.eventProducer.publishDiagramCreated({
        diagram: {
          id: diagram.id,
          fileName: diagram.fileName,
          fileType: diagram.fileType,
          fileSize: diagram.fileSize,
          storageUrl: diagram.storageUrl,
        },
        user: {
          id: input.user.id,
          name: input.user.name,
          email: input.user.email,
        },
      });
    } catch (error) {
      if (error instanceof StreamProducerError) {
        throw error;
      }
      throw error;
    }

    return {
      diagramId: diagram.id,
      status: 'queued',
      storageUrl: diagram.storageUrl,
      uploadedAt: diagram.uploadedAt.toISOString(),
    };
  }
}
