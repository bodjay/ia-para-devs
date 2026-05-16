## Agents

Os agentes de IA são workers assíncronos que consomem eventos de mensageria, executam inferência com LLM e publicam o resultado em outro tópico ou ferramenta HTTP.

- **`architecture-analysis-agent`** — consome **Redis Streams** e publica em **Kafka**. Suporta Claude API ou Ollama (configurável via `AI_PROVIDER`).
- **`orchestrator-agent`** — consome e publica em **Kafka**. Usa **Ollama exclusivamente** para roteamento e geração de resposta.

---

### architecture-analysis-agent

**Responsabilidade:** Analisar o texto OCR extraído do diagrama e produzir revisão arquitetural com componentes, riscos e recomendações.

**Modo de operação:**
- Consome: `diagram.processed`
- Publica: `analysis.completed`
- Consumer group: `analysis-agent-group`
- Session timeout: 300s (cobre inferência de até 5 min no Ollama)

**Entrada (evento `diagram.processed`):**
Usa `processing.extractedText` (texto OCR do Textract) como contexto principal. Os campos `processing.elements` e `processing.connections` são incluídos quando disponíveis.

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

**Provider de IA:** Ollama (`qwen3:4b` padrão) ou Claude (`claude-sonnet-4-6`), configurável via `AI_PROVIDER` e `OLLAMA_MODEL`.

**Tools disponíveis (chamadas ao report-service):**

| Tool | Endpoint | Descrição |
|---|---|---|
| `store_report(...)` | `POST /tools/reports` | Persiste o relatório de análise no MongoDB |

**Variáveis de ambiente:**
- `KAFKA_BROKERS` (default: `localhost:9092`)
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `qwen3:4b`)
- `REPORT_SERVICE_URL` (default: `http://localhost:3002`)
- `AI_PROVIDER` (default: `ollama` — use `claude` para Claude API)
- `ANTHROPIC_API_KEY` (obrigatório se `AI_PROVIDER=claude`)

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
- `retrieval_node` — busca semântica no `vector-service` (RAG) antes do roteamento
- `router_node` — classifica a intenção via LLM
- `conversation_node` — responde perguntas gerais (usa contexto RAG se disponível)
- `risk_node` — análise de riscos (usa contexto RAG se disponível)
- `recommendation_node` — recomendações arquiteturais (usa contexto RAG se disponível)
- `no_analysis_node` — sem contexto de análise disponível

**Fluxo RAG:**
1. `retrieval_node` envia a pergunta ao `vector-service` via HTTP GET
2. Chunks semânticos relevantes (score ≤ 0.6) são adicionados ao estado como `retrievedContext`
3. Os nós terminais injetam `retrievedContext` no system prompt sob `## Contexto de Análises Anteriores`
4. Se o `vector-service` estiver indisponível, o fluxo continua normalmente com `retrievedContext = []`

**Variáveis de ambiente:**
- `KAFKA_BROKERS` (default: `localhost:9092`)
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `qwen3:4b`)
- `OLLAMA_TIMEOUT_MS` (default: `300000`)
- `OLLAMA_ROUTER_TIMEOUT_MS` (default: `45000`)
- `VECTOR_SERVICE_URL` (default: `http://localhost:3006`)
- `VECTOR_SERVICE_TIMEOUT_MS` (default: `10000`)

> **Nota:** o `orchestrator-agent` usa **Ollama exclusivamente**. Não há suporte a `AI_PROVIDER=claude` neste serviço.
