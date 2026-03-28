
### bff
O BFF (Backend for Frontend) atua como a camada intermediária entre o cliente (frontend) e os microserviços, centralizando a comunicação e adaptando as respostas às necessidades específicas da interface.

#### POST /analysis/create
##### Request
````
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
````

##### Response

````json
{
  "analysisId": "string",
  "status": "created",
  "createdAt": "ISO-8601",
  "estimatedCompletionSeconds": 0
}
````

#### GET /analysis/:id
##### Response

````json
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
````
