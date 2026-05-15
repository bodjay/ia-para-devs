
### report-service

Tool server HTTP. Recebe chamada do `architecture-analysis-agent` após inferência LLM, persiste o relatório no MongoDB e retorna o `reportId`.

Não consome Kafka diretamente — é chamado via HTTP pelo agente como uma "tool call".

#### POST /tools/reports

**Request (`AnalysisCompletedEvent`):**
```json
{
  "analysisId": "string",
  "diagramId": "string",
  "status": "completed | failed",
  "result": {
    "components": [
      { "name": "string", "type": "microservice | database | broker | client | unknown", "description": "string", "observations": "string" }
    ],
    "architecturePatterns": [
      { "name": "string", "confidence": 0.0, "description": "string" }
    ],
    "risks": [
      { "title": "string", "description": "string", "severity": "low | medium | high", "affectedComponents": ["string"] }
    ],
    "recommendations": [
      { "title": "string", "description": "string", "priority": "low | medium | high", "relatedRisks": ["string"] }
    ],
    "summary": "string"
  },
  "error": { "code": "string", "message": "string" }
}
```

**Response:**
```json
{ "reportId": "string" }
```
