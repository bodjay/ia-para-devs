
### upload-service

#### AWS SDK Reference
- [@aws-sdk/client-s3 API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/)
O upload-service é responsável por receber arquivos de diagramas (imagem ou PDF) enviados pelo cliente, validar seus metadados, armazenar o arquivo em um bucket (S3), sakvar seu link de download em umem uma coleção e iniciar o fluxo assíncrono de processamento;

#### POST /upload

**Autenticação interna:** requer header `x-upload-token` com token temporário gerado pelo BFF via `POST /sessions/:id/upload-token`.

##### Request (multipart/form-data)

| Campo | Tipo | Descrição |
|---|---|---|
| `file` | `File` | Arquivo de diagrama (`image/png`, `image/jpeg`, `application/pdf`) |
| `user` | `JSON string` | Identificador do chamador — injetado pelo BFF como `SYSTEM_USER` (não enviado pelo frontend) |

O campo `user` enviado pelo BFF tem sempre o valor fixo:
```json
{ "id": "system", "name": "System", "email": "system@arch-analyzer.local" }
```

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