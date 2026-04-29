import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ExtractDiagramUseCase } from '../../application/use-cases/ExtractDiagramUseCase';
import { SupportedFileType } from '../../domain/use-cases/IExtractDiagramUseCase';
import { DiagramProcessedProducer } from './DiagramProcessedProducer';

interface DiagramCreatedEvent {
  eventId: string;
  timestamp: string;
  diagram: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class DiagramCreatedConsumer {
  private consumer: Consumer;
  private readonly topic = 'diagram.created';
  private readonly groupId = 'extraction-agent-group';

  constructor(
    private readonly kafka: Kafka,
    private readonly extractUseCase: ExtractDiagramUseCase,
    private readonly producer: DiagramProcessedProducer
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 420_000,
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
        const keepAlive = setInterval(() => void payload.heartbeat(), 10_000);
        try {
          await this.processMessage(payload);
          await payload.commitOffsetsIfNecessary?.();
        } catch (error) {
          console.error(
            '[DiagramCreatedConsumer] Processing failed, offset not committed (will retry):',
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

    let event: DiagramCreatedEvent;
    try {
      event = JSON.parse(rawValue) as DiagramCreatedEvent;
    } catch {
      console.error('[DiagramCreatedConsumer] Failed to parse message');
      return;
    }

    const result = await this.extractUseCase.execute({
      action: 'extract',
      payload: {
        diagram: {
          id: event.diagram.id,
          storageUrl: event.diagram.storageUrl,
          fileType: event.diagram.fileType as SupportedFileType,
        },
        userId: event.user.id,
      },
    });

    await this.producer.publishDiagramProcessed({
      diagram: {
        id: event.diagram.id,
        fileName: event.diagram.fileName,
        fileType: event.diagram.fileType,
        storageUrl: event.diagram.storageUrl,
      },
      processing: {
        status: result.error ? 'failed' : 'processed',
        extractedText: result.extractedText,
        elements: result.elements,
        connections: result.connections,
      },
      ...(result.error && { error: result.error }),
    });
  }
}
