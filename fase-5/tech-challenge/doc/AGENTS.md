## Agents

Os agentes de IA são **Kafka-native workers**: consomem eventos de tópicos Kafka, executam inferência com LLM e publicam o resultado em outro tópico.

Os agentes usam **Ollama com o modelo `qwen3:2b`** (suporta tool calling) e delegam capacidades especializadas para os tool servers (`processing-service` e `report-service`) via chamadas HTTP.

---

### diagram-extraction-agent

**Responsabilidade:** Extrair e estruturar elementos visuais de diagramas de arquitetura.

**Modo de operação:**
- Consome: `diagram.created`
- Publica: `diagram.processed`
- Consumer group: `extraction-agent-group`
- Session timeout: 420s (cobre inferência de até 7 min no Ollama)

**Entrada (evento `diagram.created`):**
```json
{
  "diagram": { "id", "fileName", "fileType", "storageUrl" },
  "user": { "id", "name", "email" }
}
```

**Saída (evento `diagram.processed`):**
```json
{
  "diagram": { "id", "fileName", "fileType", "storageUrl" },
  "processing": {
    "status": "processed | failed",
    "extractedText": "...",
    "elements": [{ "id", "label", "type", "confidence", "boundingBox" }],
    "connections": [{ "fromElementId", "toElementId", "type" }]
  }
}
```

**Provider de IA:** Ollama (`qwen3:2b`), configurável via `OLLAMA_MODEL`.

**Tools disponíveis (chamadas ao processing-service):**

| Tool | Endpoint | Descrição |
|---|---|---|
| `ocr_extract(s3_url)` | `POST /tools/ocr` | Extrai texto do diagrama via AWS Textract |
| `save_job(diagram_id)` | `POST /tools/jobs` | Cria registro de ProcessingJob no MongoDB |
| `update_job(job_id, ...)` | `PUT /tools/jobs/:id` | Atualiza status/resultado do job |

**Variáveis de ambiente:**
- `KAFKA_BROKERS` (default: `localhost:9092`)
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `qwen3:2b`)
- `PROCESSING_SERVICE_URL` (default: `http://localhost:3001`)

---

### architecture-analysis-agent

**Responsabilidade:** Analisar dados estruturados do diagrama e produzir revisão arquitetural com componentes, riscos e recomendações.

**Modo de operação:**
- Consome: `diagram.processed`
- Publica: `analysis.completed`
- Consumer group: `analysis-agent-group`
- Session timeout: 300s (cobre inferência de até 5 min no Ollama)

**Entrada (evento `diagram.processed`):**
Usa `processing.elements` e `processing.connections` do evento.

**Saída (evento `analysis.completed`):**
```json
{
  "analysisId": "uuid",
  "diagramId": "uuid",
  "status": "completed | failed",
  "result": {
    "components": [...],
    "risks": [...],
    "recommendations": [...],
    "summary": "..."
  }
}
```

**Provider de IA:** Ollama (`qwen3:2b`), configurável via `OLLAMA_MODEL`.

**Tools disponíveis (chamadas ao report-service):**

| Tool | Endpoint | Descrição |
|---|---|---|
| `store_report(...)` | `POST /tools/reports` | Persiste o relatório de análise no MongoDB |

**Variáveis de ambiente:**
- `KAFKA_BROKERS` (default: `localhost:9092`)
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `qwen3:2b`)
- `REPORT_SERVICE_URL` (default: `http://localhost:3002`)

---

### orchestrator-agent

**Responsabilidade:** Classificar a intenção da pergunta do usuário e gerar resposta contextualizada usando LangGraph StateGraph.

**Modo de operação:**
- Consome: `chat.requested`
- Publica: `chat.responded`
- Consumer group: `orchestrator-agent-group`
- Session timeout: 180s

**Entrada (evento `chat.requested`):**
```json
{
  "correlationId": "uuid",
  "sessionId": "uuid",
  "question": "...",
  "history": [{ "role": "user|assistant", "content": "..." }],
  "analysisContext": { "summary", "components", "risks", "recommendations" }
}
```

**Saída (evento `chat.responded`):**
```json
{
  "correlationId": "uuid",
  "sessionId": "uuid",
  "response": "...",
  "route": "chat | risk_analysis | recommendations | no_analysis"
}
```

**LangGraph nodes:**
- `router_node` — classifica a intenção via LLM
- `conversation_node` — responde perguntas gerais
- `risk_node` — análise de riscos
- `recommendation_node` — recomendações arquiteturais
- `no_analysis_node` — sem contexto de análise disponível
