import { ProcessingJob } from '../../domain/entities/ProcessingJob';
import { IProcessingJobRepository } from '../../domain/repositories/IProcessingJobRepository';
import {
  IProcessDiagramUseCase,
  DiagramCreatedEvent,
} from '../../domain/use-cases/IProcessDiagramUseCase';
import { DiagramProcessedProducer } from '../../infrastructure/redis/DiagramProcessedProducer';
import { ITextractAdapter } from '../../infrastructure/textract/TextractAdapter';

export class ProcessDiagramUseCase implements IProcessDiagramUseCase {
  constructor(
    private readonly repository: IProcessingJobRepository,
    private readonly textractAdapter: ITextractAdapter,
    private readonly producer: DiagramProcessedProducer
  ) {}

  async execute(event: DiagramCreatedEvent): Promise<void> {
    if (!event.diagram?.id) {
      console.error('[ProcessDiagramUseCase] Malformed diagram.created event: missing diagramId');
      await this.producer.publishDiagramProcessed({
        diagram: {
          id: event.diagram?.id ?? 'unknown',
          fileName: event.diagram?.fileName ?? 'unknown',
          fileType: event.diagram?.fileType ?? 'unknown',
          storageUrl: event.diagram?.storageUrl ?? '',
        },
        processing: { status: 'failed' },
        error: { code: 'INVALID_EVENT', message: 'Missing diagramId in event' },
      });
      return;
    }

    const existingJob = await this.repository.findByDiagramId(event.diagram.id);
    if (existingJob && existingJob.status !== 'failed') {
      console.warn(
        `[ProcessDiagramUseCase] Duplicate delivery for diagram ${event.diagram.id} — job already ${existingJob.status}, skipping`
      );
      return;
    }

    const job = new ProcessingJob({ diagramId: event.diagram.id });
    job.start();
    await this.repository.save(job);

    try {
      let extractedText = '';
      console.log(
        `[ProcessDiagramUseCase] Iniciando extração Textract | diagramId=${event.diagram.id} storageUrl=${event.diagram.storageUrl}`
      );
      try {
        extractedText = await this.textractAdapter.extractText(event.diagram.storageUrl);
        console.log(
          `[ProcessDiagramUseCase] Textract concluído | diagramId=${event.diagram.id} chars=${extractedText.length}`
        );
      } catch (textractError) {
        console.warn(
          `[ProcessDiagramUseCase] Textract falhou | diagramId=${event.diagram.id} erro="${(textractError as Error).message}"`
        );
      }

      job.complete(extractedText, [], []);
      await this.repository.update(job);

      await this.producer.publishDiagramProcessed({
        diagram: {
          id: event.diagram.id,
          fileName: event.diagram.fileName,
          fileType: event.diagram.fileType,
          storageUrl: event.diagram.storageUrl,
        },
        processing: {
          status: 'processed',
          extractedText,
          elements: [],
          connections: [],
        },
      });
    } catch (error) {
      const processingError = { code: 'PROCESSING_ERROR', message: (error as Error).message };

      job.fail(processingError);
      await this.repository.update(job);

      await this.producer.publishDiagramProcessed({
        diagram: {
          id: event.diagram.id,
          fileName: event.diagram.fileName,
          fileType: event.diagram.fileType,
          storageUrl: event.diagram.storageUrl,
        },
        processing: { status: 'failed' },
        error: processingError,
      });
    }
  }
}
