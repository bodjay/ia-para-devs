import { Consumer, Kafka } from 'kafkajs';
import { IGenerateReportUseCase } from '../../domain/use-cases/IGenerateReportUseCase';

export interface DiagramProcessedEvent {
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
    extractedText: string;
    elements: Array<{
      type: string;
      label: string;
      position: { x: number; y: number };
    }>;
  };
}

export class DiagramProcessedConsumer {
  private consumer: Consumer;
  private readonly topic = 'diagram.processed';

  constructor(
    private readonly kafka: Kafka,
    private readonly generateReportUseCase: IGenerateReportUseCase,
    private readonly groupId: string = 'report-service-group'
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 300000,  // 5 min — allows long Ollama inference
      heartbeatInterval: 10000, // 10s heartbeat
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  async start(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message, heartbeat }) => {
        let event: DiagramProcessedEvent;

        try {
          const raw = message.value?.toString();
          if (!raw) {
            return;
          }
          event = JSON.parse(raw) as DiagramProcessedEvent;
        } catch {
          console.error('Failed to parse diagram.processed message');
          return;
        }

        if (event.processing.status === 'failed') {
          return;
        }

        // Keep the broker heartbeat alive during long Ollama inference
        const heartbeatTimer = setInterval(() => heartbeat().catch(() => {}), 8000);

        try {
          await this.generateReportUseCase.execute({
            diagramId: event.diagram.id,
            fileName: event.diagram.fileName,
            fileType: event.diagram.fileType,
            storageUrl: event.diagram.storageUrl,
            extractedText: event.processing.extractedText,
            elements: event.processing.elements.map((el, idx) => ({
              id: `element-${idx}`,
              label: el.label,
              type: el.type as any,
              position: el.position,
            })),
          });
        } finally {
          clearInterval(heartbeatTimer);
        }

        await heartbeat();
      },
    });
  }
}
