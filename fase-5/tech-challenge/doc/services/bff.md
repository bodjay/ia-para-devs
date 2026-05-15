
### bff

API Gateway e ponto único de entrada para o frontend. Porta: `3001`.

---

#### Diagrams

##### POST /diagrams/upload
Faz upload do diagrama para o `upload-service`, cria registro de análise e vincula à sessão.

**Request:** `multipart/form-data`
```
file: <arquivo>
sessionId: string
```

**Response:**
```json
{
  "diagramId": "string",
  "analysisId": "string",
  "sessionId": "string"
}
```

##### GET /diagrams/:diagramId/image
Retorna a imagem do diagrama armazenado.

---

#### Analysis

##### POST /analysis/create
Cria um registro de análise avulso.

**Request:**
```json
{
  "diagramId": "string",
  "sessionId": "string"
}
```

**Response:**
```json
{
  "analysisId": "string",
  "status": "pending",
  "createdAt": "ISO-8601"
}
```

##### GET /analysis/:id
Retorna o resultado da análise.

**Response:**
```json
{
  "analysisId": "string",
  "status": "pending | processing | completed | failed",
  "result": {
    "components": [...],
    "risks": [...],
    "recommendations": [...],
    "architecturePatterns": [...],
    "summary": "string"
  },
  "error": { "code": "string", "message": "string" }
}
```

---

#### Sessions

##### GET /sessions
Lista todas as sessões.

##### POST /sessions
Cria nova sessão.

**Request:** `{ "name": "string" }`  
**Response:** `{ "sessionId": "string", "name": "string", "createdAt": "ISO-8601" }`

##### PATCH /sessions/:id
Renomeia a sessão. **Request:** `{ "name": "string" }`

##### GET /sessions/:id/export
Exporta o contexto da sessão como prompt para uso no Claude Code.

**Response:** `{ "text": "string" }`

##### GET /sessions/:id/messages
Lista o histórico de mensagens da sessão.

##### POST /sessions/:id/messages
Envia mensagem via HTTP (fallback — fluxo principal usa WebSocket).

**Request:** `{ "content": "string" }`

##### POST /sessions/:id/upload-token
Gera token temporário (Redis) para autorizar upload no `upload-service`.

**Response:** `{ "token": "string" }`

---

#### WebSocket

**Endpoint:** `ws://bff:3001/ws/sessions/:sessionId`

**Mensagem do cliente:**
```json
{ "type": "chat", "question": "string" }
```

**Resposta do servidor:**
```json
{ "type": "assistant_message", "content": "string", "route": "chat | risk_analysis | recommendations | no_analysis" }
```

**Fluxo:**
1. Cliente conecta e envia pergunta via WebSocket
2. BFF persiste mensagem do usuário, publica em `chat.requested`
3. Orchestrator-agent processa via LangGraph e publica em `chat.responded`
4. BFF consome `chat.responded` e faz push ao cliente via WebSocket
