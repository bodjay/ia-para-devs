# architecture-analysis-agent
Analisar arquitetura e gerar diagnóstico técnico com base em UML e boas práticas

## Invocation
````json
{
  "action": "analyze",
  "payload": { } // INPUT
}
````

## Input
````json
{
  "diagramId": "string",
  "elements": [
    {
      "id": "string",
      "label": "string",
      "type": "microservice | database | broker | client | unknown"
    }
  ],
  "connections": [
    {
      "fromElementId": "string",
      "toElementId": "string",
      "type": "sync | async | unknown"
    }
  ],
  "options": {
    "analysisDepth": "basic | intermediate | deep",
    "includeRisks": true,
    "includeRecommendations": true,
    "language": "pt-BR"
  }
}
````

## Output
````json
{
  "analysisId": "string",
  "status": "completed | failed",
  "components": [
    {
      "name": "string",
      "type": "microservice | database | broker | client",
      "description": "string",
      "observations": "string"
    }
  ],
  "architecturePatterns": [
    {
      "name": "string",
      "confidence": 0.0,
      "description": "string"
    }
  ],
  "risks": [
    {
      "title": "string",
      "description": "string",
      "severity": "low | medium | high",
      "affectedComponents": ["string"]
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "priority": "low | medium | high",
      "relatedRisks": ["string"]
    }
  ],
  "summary": "string",
  "error": {
    "code": "string",
    "message": "string"
  }
}
````
