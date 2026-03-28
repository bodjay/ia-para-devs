# diagram-extraction-agent
Extrair informações estruturadas de diagramas (imagem/PDF).

## Invocation
````json
{
  "action": "extract",
  "payload": { } // $INPUT
}
````

## Input
````json
{
  "diagram": {
    "id": "string",
    "fileType": "image/png | image/jpeg | application/pdf",
    "storageUrl": "string"
  },
  "options": {
    "detectText": true,
    "detectShapes": true,
    "detectConnections": true,
    "language": "pt-BR"
  }
}
````

## Output
````json
{
  "diagramId": "string",
  "status": "processed | failed",
  "extractedText": "string",
  "elements": [
    {
      "id": "string",
      "label": "string",
      "type": "microservice | database | broker | client | unknown",
      "confidence": 0.0,
      "boundingBox": {
        "x": 0,
        "y": 0,
        "width": 0,
        "height": 0
      }
    }
  ],
  "connections": [
    {
      "fromElementId": "string",
      "toElementId": "string",
      "type": "sync | async | unknown",
      "label": "string"
    }
  ],
  "error": {
    "code": "string",
    "message": "string"
  }
}
````
