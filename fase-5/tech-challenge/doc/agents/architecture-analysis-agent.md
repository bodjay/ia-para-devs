# architecture-analysis-agent

Analisar o texto OCR extraído do diagrama e produzir revisão arquitetural com componentes, riscos e recomendações.

## Invocation

Acionado automaticamente ao consumir o stream Redis `streams:diagram:processed` (XREADGROUP, group: `analysis-agent-group`).

## Input (evento `diagram.processed` — Redis Streams)

```json
{
  "diagramId": "string",
  "processing": {
    "extractedText": "string",
    "elements": [...],
    "connections": [...]
  }
}
```

O campo `processing.extractedText` é o contexto primário enviado ao LLM. Os campos `elements` e `connections` são incluídos quando disponíveis.

## LLM Provider

Configurável via `AI_PROVIDER`:
- `ollama` (padrão) — usa `OllamaAnalysisClient` com `OLLAMA_MODEL` (default: `qwen3:4b`)
- `claude` — usa `ClaudeAnalysisClient` com `claude-sonnet-4-6` (requer `ANTHROPIC_API_KEY`)

## Tools (chamadas ao report-service)

| Tool | Endpoint | Descrição |
|---|---|---|
| `store_report(...)` | `POST /tools/reports` | Persiste o relatório de análise no MongoDB |

## Output (evento `analysis.completed` — Kafka)

```json
{
  "analysisId": "string",
  "diagramId": "string",
  "status": "completed | failed",
  "result": {
    "components": [...],
    "risks": [...],
    "recommendations": [...],
    "summary": "string"
  }
}
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `KAFKA_BROKERS` | `localhost:9092` | Brokers Kafka para publicar `analysis.completed` |
| `REDIS_URL` | `redis://localhost:6379` | Redis para consumir `streams:diagram:processed` |
| `REPORT_SERVICE_URL` | `http://localhost:3002` | URL do tool server do report-service |
| `AI_PROVIDER` | `ollama` | `ollama` ou `claude` |
| `ANTHROPIC_API_KEY` | — | Obrigatório se `AI_PROVIDER=claude` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do Ollama |
| `OLLAMA_MODEL` | `qwen3:4b` | Modelo Ollama |
