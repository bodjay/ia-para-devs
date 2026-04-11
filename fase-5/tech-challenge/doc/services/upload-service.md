
### upload-service
O upload-service é responsável por receber arquivos de diagramas (imagem ou PDF) enviados pelo cliente, validar seus metadados, armazenar o arquivo em um bucket (S3), sakvar seu link de download em umem uma coleção e iniciar o fluxo assíncrono de processamento;

#### POST /upload
##### Request
````json
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
````

##### Response

````json
{
  "diagramId": "string",
  "status": "uploaded",
  "storageUrl": "string",
  "uploadedAt": "ISO-8601"
}
````
#### Producer — diagram.created
##### Output
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