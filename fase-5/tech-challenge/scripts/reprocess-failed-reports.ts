/**
 * Reprocess reports with analysis errors.
 *
 * Strategy:
 *   - For each failed report, look up its ProcessingJob (processing-service DB).
 *   - If the job succeeded → publish `diagram.processed` (re-run only the analysis step).
 *   - If the job failed / not found → look up the Diagram (upload-service DB) and publish
 *     `diagram.created` (restart the full pipeline).
 *
 * Usage:
 *   ts-node scripts/reprocess-failed-reports.ts [options]
 *
 * Options:
 *   --dry-run                  Print what would be published without sending any Kafka messages.
 *   --diagram-id <id>          Reprocess only the report for this diagram.
 *   --error-code <code>        Filter reports by error.code (e.g. ANALYSIS_ERROR, INTERNAL_ERROR).
 *   --limit <n>                Maximum number of reports to reprocess (default: 100).
 *   --from-beginning           Always publish diagram.created, even if a successful processing job exists.
 *
 * Environment variables:
 *   REPORTS_MONGO_URI          MongoDB URI for the report-service database.
 *                              Default: mongodb://localhost:27017/arch-analyzer-reports
 *   PROCESSING_MONGO_URI       MongoDB URI for the processing-service database.
 *                              Default: mongodb://localhost:27017/arch-analyzer-processing
 *   UPLOADS_MONGO_URI          MongoDB URI for the upload-service database.
 *                              Default: mongodb://localhost:27017/arch-analyzer-uploads
 *   KAFKA_BROKERS              Comma-separated list of Kafka brokers.
 *                              Default: localhost:9092
 */

import mongoose, { Connection, Schema, Document } from 'mongoose';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  dryRun: boolean;
  diagramId: string | null;
  errorCode: string | null;
  limit: number;
  fromBeginning: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fromBeginning = args.includes('--from-beginning');

  const diagramIdIdx = args.indexOf('--diagram-id');
  const diagramId = diagramIdIdx !== -1 ? (args[diagramIdIdx + 1] ?? null) : null;

  const errorCodeIdx = args.indexOf('--error-code');
  const errorCode = errorCodeIdx !== -1 ? (args[errorCodeIdx + 1] ?? null) : null;

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? '100', 10) : 100;

  return { dryRun, diagramId, errorCode, limit, fromBeginning };
}

// ---------------------------------------------------------------------------
// Mongoose document interfaces (raw shape stored in each DB)
// ---------------------------------------------------------------------------

interface ReportDoc extends Document {
  reportId: string;
  diagramId: string;
  status: string;
  error?: { code: string; message: string };
  createdAt: Date;
}

interface ProcessingJobDoc extends Document {
  jobId: string;
  diagramId: string;
  status: string;
  extractedText: string;
  elements: Array<{ type: string; label: string; position: { x: number; y: number } }>;
}

interface DiagramDoc extends Document {
  diagramId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// Kafka event payloads
// ---------------------------------------------------------------------------

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
  user: { id: string; name: string; email: string };
}

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
    status: 'processed';
    extractedText: string;
    elements: Array<{ type: string; label: string; position: { x: number; y: number } }>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function openConnection(uri: string, name: string): Promise<Connection> {
  const conn = mongoose.createConnection(uri);
  await conn.asPromise();
  log(`Connected to ${name}: ${uri}`);
  return conn;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { dryRun, diagramId, errorCode, limit, fromBeginning } = parseArgs();

  const REPORTS_MONGO_URI =
    process.env.REPORTS_MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-reports';
  const PROCESSING_MONGO_URI =
    process.env.PROCESSING_MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-processing';
  const UPLOADS_MONGO_URI =
    process.env.UPLOADS_MONGO_URI ?? 'mongodb://localhost:27017/arch-analyzer-uploads';
  const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

  if (dryRun) {
    log('DRY RUN — no Kafka messages will be published.');
  }

  // ── Mongoose connections ─────────────────────────────────────────────────
  const reportsConn = await openConnection(REPORTS_MONGO_URI, 'reports-db');
  const processingConn = await openConnection(PROCESSING_MONGO_URI, 'processing-db');
  const uploadsConn = await openConnection(UPLOADS_MONGO_URI, 'uploads-db');

  // ── Models ───────────────────────────────────────────────────────────────
  const ReportModel = reportsConn.model<ReportDoc>(
    'Report',
    new Schema<ReportDoc>({
      reportId: String,
      diagramId: String,
      status: String,
      error: { code: String, message: String },
      createdAt: Date,
    })
  );

  const ProcessingJobModel = processingConn.model<ProcessingJobDoc>(
    'ProcessingJob',
    new Schema<ProcessingJobDoc>({
      jobId: String,
      diagramId: String,
      status: String,
      extractedText: String,
      elements: [{ type: String, label: String, position: { x: Number, y: Number } }],
    })
  );

  const DiagramModel = uploadsConn.model<DiagramDoc>(
    'Diagram',
    new Schema<DiagramDoc>({
      diagramId: String,
      fileName: String,
      fileType: String,
      fileSize: Number,
      storageUrl: String,
      userId: String,
    })
  );

  // ── Query failed reports ─────────────────────────────────────────────────
  const filter: Record<string, unknown> = { status: 'failed' };
  if (diagramId) filter['diagramId'] = diagramId;
  if (errorCode) filter['error.code'] = errorCode;

  const failedReports = await ReportModel.find(filter)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean()
    .exec();

  if (failedReports.length === 0) {
    log('No failed reports found matching the given criteria.');
    await cleanup([reportsConn, processingConn, uploadsConn], null);
    return;
  }

  log(`Found ${failedReports.length} failed report(s) to reprocess.`);

  // ── Kafka producer ───────────────────────────────────────────────────────
  const kafka = new Kafka({ clientId: 'reprocess-script', brokers: KAFKA_BROKERS });
  let producer: Producer | null = null;

  if (!dryRun) {
    producer = kafka.producer();
    await producer.connect();
    log('Kafka producer connected.');
  }

  // ── Process each report ──────────────────────────────────────────────────
  let published = 0;
  let skipped = 0;

  for (const report of failedReports) {
    const dId = report.diagramId;
    log(`\nReport ${report.reportId} | diagramId: ${dId} | error: ${report.error?.code ?? 'n/a'} — ${report.error?.message ?? ''}`);

    // Look up processing job
    const job = await ProcessingJobModel.findOne({ diagramId: dId }).lean().exec();

    const jobSucceeded = job !== null && job.status !== 'failed';

    if (!fromBeginning && jobSucceeded) {
      // Re-trigger only the analysis/report step
      const event: DiagramProcessedEvent = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        diagram: {
          id: dId,
          fileName: '', // not stored in processing job; report-service only needs storageUrl
          fileType: '',
          storageUrl: '',
        },
        processing: {
          status: 'processed',
          extractedText: job.extractedText ?? '',
          elements: job.elements ?? [],
        },
      };

      // Enrich with diagram metadata if available
      const diagram = await DiagramModel.findOne({ diagramId: dId }).lean().exec();
      if (diagram) {
        event.diagram.fileName = diagram.fileName;
        event.diagram.fileType = diagram.fileType;
        event.diagram.storageUrl = diagram.storageUrl;
      }

      log(`  → Publishing diagram.processed (re-run analysis only)`);
      if (dryRun) {
        log(`  [DRY RUN] Would publish to topic diagram.processed: ${JSON.stringify(event, null, 2)}`);
      } else {
        await producer!.send({
          topic: 'diagram.processed',
          messages: [{ key: dId, value: JSON.stringify(event) }],
        });
        log(`  ✓ Published to diagram.processed`);
      }
      published++;
    } else {
      // Re-trigger the full pipeline from diagram.created
      const diagram = await DiagramModel.findOne({ diagramId: dId }).lean().exec();
      if (!diagram) {
        log(`  ✗ Skipped — diagram metadata not found in uploads-db (diagramId: ${dId})`);
        skipped++;
        continue;
      }

      const event: DiagramCreatedEvent = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        diagram: {
          id: dId,
          fileName: diagram.fileName,
          fileType: diagram.fileType,
          fileSize: diagram.fileSize,
          storageUrl: diagram.storageUrl,
        },
        user: {
          id: diagram.userId,
          name: 'reprocess-script',
          email: 'reprocess-script@system',
        },
      };

      const reason = fromBeginning ? '--from-beginning flag' : 'processing job failed or not found';
      log(`  → Publishing diagram.created (full reprocess — ${reason})`);
      if (dryRun) {
        log(`  [DRY RUN] Would publish to topic diagram.created: ${JSON.stringify(event, null, 2)}`);
      } else {
        await producer!.send({
          topic: 'diagram.created',
          messages: [{ key: dId, value: JSON.stringify(event) }],
        });
        log(`  ✓ Published to diagram.created`);
      }
      published++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  log(`\nDone. Published: ${published} | Skipped: ${skipped} | Total: ${failedReports.length}`);

  await cleanup([reportsConn, processingConn, uploadsConn], producer);
}

async function cleanup(connections: Connection[], producer: Producer | null): Promise<void> {
  if (producer) {
    await producer.disconnect();
    log('Kafka producer disconnected.');
  }
  for (const conn of connections) {
    await conn.close();
  }
  log('MongoDB connections closed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
