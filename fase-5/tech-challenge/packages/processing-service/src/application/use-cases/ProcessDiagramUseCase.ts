import { v4 as uuidv4 } from 'uuid';
import { ProcessingJob, DiagramConnection, DiagramElement } from '../../domain/entities/ProcessingJob';
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
import { ITextractAdapter } from '../../infrastructure/textract/TextractAdapter';

export class ProcessDiagramUseCase implements IProcessDiagramUseCase {
  constructor(
    private readonly repository: IProcessingJobRepository,
    private readonly textractAdapter: ITextractAdapter,
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
      try {
        extractedText = await this.textractAdapter.extractText(event.diagram.storageUrl);
      } catch (textractError) {
        console.warn(
          'Textract extraction failed, proceeding without pre-extracted text:',
          (textractError as Error).message
        );
      }

      const agentResult = await this.agentClient.extract({
        diagram: {
          id: event.diagram.id,
          fileType: event.diagram.fileType,
          storageUrl: event.diagram.storageUrl,
        },
        extractedText,
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

        const failedConnections: DiagramConnection[] = agentResult.connections.map((conn) => ({
          fromElementId: conn.fromElementId,
          toElementId: conn.toElementId,
          type: conn.type,
          label: conn.label,
        }));

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
              id: el.id,
              type: el.type,
              label: el.label,
              position: { x: el.boundingBox.x, y: el.boundingBox.y },
            })),
            connections: failedConnections,
          },
          error: agentResult.error,
        });
        return;
      }

      const elements: DiagramElement[] = agentResult.elements.map((el) => ({
        id: el.id,
        type: el.type,
        label: el.label,
        position: { x: el.boundingBox.x, y: el.boundingBox.y },
      }));

      const connections: DiagramConnection[] = agentResult.connections.map((conn) => ({
        fromElementId: conn.fromElementId,
        toElementId: conn.toElementId,
        type: conn.type,
        label: conn.label,
      }));

      job.complete(agentResult.extractedText, elements, connections);
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
          connections,
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
