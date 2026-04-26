import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { AnalyzeArchitectureUseCase } from '../../application/use-cases/AnalyzeArchitectureUseCase';
import { AnalysisCompletedProducer } from './AnalysisCompletedProducer';
import { ComponentType } from '../../domain/entities/ArchitectureAnalysis';

interface DiagramProcessedEvent {
  eventId: string;
  timestamp: string;
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    storageUrl: string;
  };
  processing: {
    status: 'processed' | 'failed';
    extractedText?: string;
    elements?: Array<{
      id: string;
      label: string;
      type: ComponentType;
    }>;
    connections?: Array<{
      fromElementId: string;
      toElementId: string;
      type: 'sync' | 'async' | 'unknown';
    }>;
  };
  error?: { code: string; message: string };
}

export class DiagramProcessedConsumer {
  private consumer: Consumer;
  private readonly topic = 'diagram.processed';
  private readonly groupId = 'analysis-agent-group';

  constructor(
    private readonly kafka: Kafka,
    private readonly analyzeUseCase: AnalyzeArchitectureUseCase,
    private readonly producer: AnalysisCompletedProducer
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 300_000,
      heartbeatInterval: 3_000,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async subscribe(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (rawPayload: EachMessagePayload) => {
        const payload = rawPayload as EachMessagePayload & {
          commitOffsetsIfNecessary?(): Promise<void>;
        };
        const keepAlive = setInterval(() => void payload.heartbeat(), 8_000);
        try {
          await this.processMessage(payload);
          await payload.commitOffsetsIfNecessary?.();
        } catch (error) {
          console.error(
            '[DiagramProcessedConsumer] Processing failed, offset not committed (will retry):',
            (error as Error).message
          );
        } finally {
          clearInterval(keepAlive);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const rawValue = payload.message.value?.toString();
    if (!rawValue) return;

    let event: DiagramProcessedEvent;
    try {
      event = JSON.parse(rawValue) as DiagramProcessedEvent;
    } catch {
      console.error('[DiagramProcessedConsumer] Failed to parse message');
      return;
    }

    const result = await this.analyzeUseCase.execute({
      action: 'analyze',
      payload: {
        diagramId: event.diagram.id,
        elements: (event.processing.elements ?? []).map((el) => ({
          id: el.id,
          label: el.label,
          type: el.type,
        })),
        connections: (event.processing.connections ?? []).map((c) => ({
          fromElementId: c.fromElementId,
          toElementId: c.toElementId,
          type: c.type,
        })),
      },
    });

    await this.producer.publishAnalysisCompleted(result);
  }
}
