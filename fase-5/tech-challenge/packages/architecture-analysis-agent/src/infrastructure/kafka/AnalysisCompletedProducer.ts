import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { ArchitectureAnalysis } from '../../domain/entities/ArchitectureAnalysis';

export class KafkaProducerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'KafkaProducerError';
  }
}

export class AnalysisCompletedProducer {
  private producer: Producer;
  private readonly topic = 'analysis.completed';

  constructor(private readonly kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishAnalysisCompleted(analysis: ArchitectureAnalysis): Promise<void> {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      analysisId: analysis.analysisId,
      diagramId: analysis.diagramId,
      status: analysis.status,
      ...(analysis.status === 'completed' && {
        result: {
          components: analysis.components,
          risks: analysis.risks.map((r) => ({
            title: r.title,
            description: r.description,
            severity: r.severity,
            affectedComponents: r.affectedComponents,
          })),
          recommendations: analysis.recommendations.map((rec) => ({
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            relatedRisks: rec.relatedRisks,
          })),
          summary: analysis.summary,
        },
      }),
      ...(analysis.error && { error: analysis.error }),
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{ key: analysis.diagramId, value: JSON.stringify(event) }],
      });
    } catch (error) {
      throw new KafkaProducerError(
        `Failed to publish analysis.completed event: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
