#!/usr/bin/env bash
# Wrapper for reprocess-failed-reports.ts that targets the Docker Compose stack.
#
# MongoDB is exposed on host port 27018 (docker-compose: 27018:27017).
# Kafka external listener is on host port 29092 (PLAINTEXT_HOST).
#
# All arguments are forwarded to the TypeScript script.
#
# Usage:
#   ./scripts/reprocess-failed-reports.sh [options]
#
# Examples:
#   ./scripts/reprocess-failed-reports.sh --dry-run
#   ./scripts/reprocess-failed-reports.sh --error-code ANALYSIS_ERROR --dry-run
#   ./scripts/reprocess-failed-reports.sh --error-code ANALYSIS_ERROR --limit 10
#   ./scripts/reprocess-failed-reports.sh --diagram-id <id> --dry-run

REPORTS_MONGO_URI=mongodb://localhost:27018/arch-analyzer-reports \
PROCESSING_MONGO_URI=mongodb://localhost:27018/arch-analyzer-processing \
UPLOADS_MONGO_URI=mongodb://localhost:27018/arch-analyzer-uploads \
KAFKA_BROKERS=localhost:29092 \
  npx ts-node --project tsconfig.scripts.json scripts/reprocess-failed-reports.ts "$@"
