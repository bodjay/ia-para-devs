
### processing-service

#### AWS SDK Reference
- [@aws-sdk/client-textract API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-textract/)
Realiza a extração de informações estruturais do diagrama — como textos, componentes e suas possíveis classificações — transformando dados não estruturados em uma representação intermediária compreensível pela plataforma

#### Consumer — diagram.processed
##### Input
````json
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
````

#### Kafka Producer — diagram.processed
##### Output
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
  },
  "error": {
    "code": "string",
    "message": "string"
  }
}
````
