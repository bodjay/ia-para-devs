import { v4 as uuidv4 } from 'uuid';
import { ProcessingJob, DiagramElement } from '../../domain/entities/ProcessingJob';
import { IProcessingJobRepository } from '../../domain/repositories/IProcessingJobRepository';
import {
  IProcessDiagramUseCase,
  DiagramCreatedEvent,
} from '../../domain/use-cases/IProcessDiagramUseCase';
import {
  IDiagramExtractionAgentClient,
  AgentTimeoutError,
} from '../../infrastructure/agents/DiagramExtractionAgentClient';
import { DiagramProcessedProducer } from '../../infrastructure/kafka/DiagramProcessedProducer';

export class ProcessDiagramUseCase implements IProcessDiagramUseCase {
  constructor(
    private readonly repository: IProcessingJobRepository,
    private readonly agentClient: IDiagramExtractionAgentClient,
    private readonly producer: DiagramProcessedProducer
  ) {}

  async execute(event: DiagramCreatedEvent): Promise<void> {
    if (!event.diagram?.id) {
      console.error('Malformed diagram.created event: missing diagramId');
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

    const job = new ProcessingJob({ diagramId: event.diagram.id });
    job.start();
    await this.repository.save(job);

    try {
      const agentResult = await this.agentClient.extract({
        diagram: {
          id: event.diagram.id,
          fileType: event.diagram.fileType,
          storageUrl: event.diagram.storageUrl,
        },
        options: {
          detectText: true,
          detectShapes: true,
          detectConnections: true,
          language: 'pt-BR',
        },
      });

      if (agentResult.status === 'failed' || agentResult.error) {
        job.fail(agentResult.error ?? { code: 'AGENT_FAILED', message: 'Agent returned failed status' });
        await this.repository.update(job);

        await this.producer.publishDiagramProcessed({
          diagram: {
            id: event.diagram.id,
            fileName: event.diagram.fileName,
            fileType: event.diagram.fileType,
            storageUrl: event.diagram.storageUrl,
          },
          processing: {
            status: 'failed',
            extractedText: agentResult.extractedText,
            elements: agentResult.elements.map((el) => ({
              type: el.type,
              label: el.label,
              position: { x: el.boundingBox.x, y: el.boundingBox.y },
            })),
          },
          error: agentResult.error,
        });
        return;
      }

      const elements: DiagramElement[] = agentResult.elements.map((el) => ({
        type: el.type,
        label: el.label,
        position: { x: el.boundingBox.x, y: el.boundingBox.y },
      }));

      job.complete(agentResult.extractedText, elements);
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
          extractedText: agentResult.extractedText,
          elements,
        },
      });
    } catch (error) {
      const processingError =
        error instanceof AgentTimeoutError
          ? { code: 'AGENT_TIMEOUT', message: error.message }
          : { code: 'PROCESSING_ERROR', message: (error as Error).message };

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
