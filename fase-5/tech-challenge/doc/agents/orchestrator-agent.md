# orchestrator-agent
Classificar a intenção da pergunta do usuário e gerar resposta contextualizada usando LangGraph StateGraph com RAG.

## Invocation

Acionado via Kafka ao consumir o tópico `chat.requested`.

```json
{
  "correlationId": "string",
  "sessionId": "string",
  "question": "string",
  "history": [{ "role": "user | assistant", "content": "string" }],
  "analysisContext": {
    "summary": "string",
    "components": ["string"],
    "risks": ["string"],
    "recommendations": ["string"]
  }
}
```

## LangGraph StateGraph

```
retrieval_node → router_node → conversation_node
                             → risk_node
                             → recommendation_node
                             → no_analysis_node
```

| Nó | Responsabilidade |
|---|---|
| `retrieval_node` | Busca semântica no `vector-service` (RAG); popula `retrievedContext` |
| `router_node` | Classifica intenção via LLM → `chat`, `risk_analysis`, `recommendations`, `no_analysis` |
| `conversation_node` | Responde perguntas gerais sobre componentes, fluxos e padrões |
| `risk_node` | Análise de vulnerabilidades e pontos de falha |
| `recommendation_node` | Sugestões de melhorias e boas práticas |
| `no_analysis_node` | Retorna mensagem solicitando upload de diagrama |

## Output

Publicado no tópico `chat.responded`.

```json
{
  "eventId": "string",
  "timestamp": "ISO-8601",
  "correlationId": "string",
  "sessionId": "string",
  "response": "string",
  "route": "chat | risk_analysis | recommendations | no_analysis"
}
```

## HTTP Endpoints (porta 3005, interno)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/analysis/chat` | Fallback HTTP: `{ question, analysisContext, history }` → `{ response, route }` |
| `POST` | `/context/export` | Gera prompt Markdown para uso no Claude Code: `{ sessionName, analysis, conversationTopics }` → `{ text }` |
