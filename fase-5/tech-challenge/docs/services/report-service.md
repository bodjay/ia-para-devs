
### report-service
Recebe os dados processados, aplica regras de análise arquitetural para identificar componentes, riscos e padrões relevantes, e consolida tudo em um resultado final estruturado, incluindo recomendações e resumo técnico, publicando o evento de conclusão da análise para consumo pelo restante do sistema.

#### Kafka Consumer — diagram.processed
##### Input
````json
{
  "eventId": "string",
  "timestamp": "ISO-8601",
  "diagram": {
    "id": "string",
    "fileName": "string",
    "fileType": "string",
    "storageUrl": "string"
  },
  "processing": {
    "status": "processed | failed",
    "extractedText": "string",
    "elements": [
      {
        "type": "microservice | database | broker | client | unknown",
        "label": "string",
        "position": {
          "x": 0,
          "y": 0
        }
      }
    ]
  }
}
````
#### Kafka Producer — analysis.completed
##### Output
````json
{
  "eventId": "string",
  "timestamp": "ISO-8601",
  "analysisId": "string",
  "diagramId": "string",
  "status": "completed | failed",
  "result": {
    "components": [
      {
        "name": "string",
        "type": "microservice | database | broker | client | unknown",
        "description": "string"
      }
    ],
    "risks": [
      {
        "title": "string",
        "description": "string",
        "severity": "low | medium | high"
      }
    ],
    "recommendations": [
      {
        "title": "string",
        "description": "string",
        "priority": "low | medium | high"
      }
    ],
    "summary": "string"
  },
  "error": {
    "code": "string",
    "message": "string"
  }
}
````