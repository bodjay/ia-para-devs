## Agents

Os agentes de IA são **Kafka-native workers**: consomem eventos de tópicos Kafka, executam inferência com LLM e publicam o resultado em outro tópico. Nenhum agente expõe endpoint HTTP em produção.

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

**Providers de IA:** Claude Vision API (padrão) ou Ollama (`llava`), configurável via `AI_PROVIDER`.

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

**Providers de IA:** Claude API ou Ollama (`qwen3:4b`), configurável via `AI_PROVIDER`.

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
