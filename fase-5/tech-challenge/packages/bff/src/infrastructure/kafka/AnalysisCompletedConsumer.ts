import { Consumer, Kafka } from 'kafkajs';
import { IAnalysisRepository } from '../../domain/repositories/IAnalysisRepository';
import { AnalysisResult } from '../../domain/entities/AnalysisResult';

interface AnalysisCompletedEvent {
  eventId: string;
  timestamp: string;
  analysisId: string;
  diagramId: string;
  status: 'completed' | 'failed';
  result?: {
    components: unknown[];
    risks: unknown[];
    recommendations: unknown[];
    summary: string;
  };
  error?: { code: string; message: string };
}

export class AnalysisCompletedConsumer {
  private consumer: Consumer;
  private readonly topic = 'analysis.completed';

  constructor(
    kafka: Kafka,
    private readonly analysisRepository: IAnalysisRepository,
    private readonly groupId: string = 'bff-group'
  ) {
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 60000,
      heartbeatInterval: 5000,
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
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        let event: AnalysisCompletedEvent;
        try {
          event = JSON.parse(raw) as AnalysisCompletedEvent;
        } catch {
          console.error('[BFF] Failed to parse analysis.completed message');
          return;
        }

        const analysis = await this.analysisRepository.findByDiagramId(event.diagramId);
        if (!analysis) {
          console.warn(`[BFF] No analysis found for diagramId: ${event.diagramId}`);
          return;
        }

        if (analysis.status === 'completed') {
          console.warn(`[BFF] Skipping duplicate event for analysis ${analysis.analysisId} (already completed)`);
          return;
        }

        try {
          if (analysis.status === 'pending') {
            analysis.startProcessing();
          }

          if (event.status === 'completed' && event.result) {
            analysis.complete(
              new AnalysisResult({
                components: event.result.components as any,
                risks: event.result.risks as any,
                recommendations: event.result.recommendations as any,
                summary: event.result.summary,
              })
            );
          } else {
            analysis.fail(event.error ?? { code: 'ANALYSIS_FAILED', message: 'Analysis failed' });
          }

          await this.analysisRepository.update(analysis);
          console.log(`[BFF] Analysis ${analysis.analysisId} → ${analysis.status}`);
        } catch (err) {
          console.error(`[BFF] Failed to update analysis ${analysis.analysisId}:`, err);
        }
      },
    });
  }
}
