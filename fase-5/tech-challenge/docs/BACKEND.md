## Microserviços

### bff
O BFF (Backend for Frontend) atua como a camada intermediária entre o cliente (frontend) e os microserviços, centralizando a comunicação e adaptando as respostas às necessidades específicas da interface.

#### POST /analysis/create
##### Request
``
{
  "diagram": {
    "id": "string",
    "fileName": "string",
    "fileType": "image/png | image/jpeg | application/pdf",
    "fileSize": 0,
    "storageUrl": "string"
  },
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "options": {
    "language": "pt-BR",
    "analysisDepth": "basic | intermediate | deep",
    "includeRecommendations": true,
    "includeRisks": true
  }
}
``

##### Response

``json
{
  "analysisId": "string",
  "status": "created",
  "createdAt": "ISO-8601",
  "estimatedCompletionSeconds": 0
}
``

#### GET /analysis/:id
##### Response

``json
{
  "analysisId": "string",
  "status": "pending | processing | completed | failed",
  "createdAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "diagram": {
    "id": "string",
    "fileName": "string",
    "fileType": "string",
    "storageUrl": "string"
  },
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
``

### upload-service
O upload-service é responsável por receber arquivos de diagramas (imagem ou PDF) enviados pelo cliente, validar seus metadados, armazená-los em um repositório e iniciar o fluxo assíncrono de processamento;

#### POST /upload
##### Request
``json
{
  "file": {
    "name": "string",
    "lastModified": 0,
    "size": 0,
    "type": "image/png | image/jpeg | application/pdf",
    "webkitRelativePath": ""
  },
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
``

##### Response

``json
{
  "diagramId": "string",
  "status": "uploaded",
  "storageUrl": "string",
  "uploadedAt": "ISO-8601"
}
``
#### Producer — diagram.created
##### Output
``json
{
  "eventId": "string",
  "timestamp": "ISO-8601",
  "diagram": {
    "id": "string",
    "fileName": "string",
    "fileType": "string",
    "fileSize": 0,
    "storageUrl": "string"
  },
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
``


### processing-service
Realiza a extração de informações estruturais do diagrama — como textos, componentes e suas possíveis classificações — transformando dados não estruturados em uma representação intermediária compreensível pela plataforma

#### Consumer — diagram.processed
##### Input
``json
{
  "eventId": "string",
  "timestamp": "ISO-8601",
  "diagram": {
    "id": "string",
    "fileName": "string",
    "fileType": "string",
    "fileSize": 0,
    "storageUrl": "string"
  },
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
``

#### Kafka Producer — diagram.processed
##### Output
``json
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
  },
  "error": {
    "code": "string",
    "message": "string"
  }
}
``

### report-service
Recebe os dados processados, aplica regras de análise arquitetural para identificar componentes, riscos e padrões relevantes, e consolida tudo em um resultado final estruturado, incluindo recomendações e resumo técnico, publicando o evento de conclusão da análise para consumo pelo restante do sistema.

#### Kafka Consumer — diagram.processed
##### Input
``json
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
``
#### Kafka Producer — analysis.completed
##### Output
``json
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
``