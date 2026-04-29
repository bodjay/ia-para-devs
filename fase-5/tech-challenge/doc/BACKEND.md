## Microserviços

Cada serviço possúi banco de dados próprio e testes automatizados.

### Serviços ativos

- [serviço de api-gateway bff](@services/bff.md)
- [Serviço que lida com o upload de arquivo (upload-service)](@services/upload-service.md)

### Tool Servers (serviços de suporte aos agentes)

`processing-service` e `report-service` operam como **HTTP tool servers**: expõem endpoints de capacidades especializadas que os agentes invocam via tool calling (Ollama / qwen3:2b). Eles não consomem Kafka diretamente — os agentes são os consumidores Kafka.

#### processing-service

Provê capacidades de OCR e rastreamento de jobs para o `diagram-extraction-agent`.

- **Porta:** `PROCESSING_PORT` (default: `3001`)
- **Banco:** MongoDB (`arch-analyzer-processing`)
- **Endpoints:**
  - `POST /tools/ocr` — `{ s3Url }` → executa AWS Textract → `{ extractedText }`
  - `POST /tools/jobs` — `{ diagramId }` → cria ProcessingJob → `{ jobId }`
  - `PUT /tools/jobs/:id` — `{ status, extractedText?, elements?, connections?, error? }` → atualiza job

#### report-service

Provê persistência de relatórios para o `architecture-analysis-agent`. Mantém também um consumer Kafka passivo de `analysis.completed` para auditoria.

- **Porta:** `REPORT_PORT` (default: `3002`)
- **Banco:** MongoDB (`arch-analyzer-reports`)
- **Endpoints:**
  - `POST /tools/reports` — recebe `AnalysisCompletedEvent` → cria/atualiza Report → `{ reportId }`

---

### bff

API Gateway e ponto único de entrada para o frontend. Responsabilidades:
- Receber upload de diagrama e encaminhar ao `upload-service` via HTTP
- Consumir `analysis.completed` para atualizar o status da análise no MongoDB
- Manter conexões WebSocket com o frontend para o fluxo de chat
- Publicar `chat.requested` e consumir `chat.responded` para orquestrar o chat via Kafka

### upload-service

Recebe o arquivo do BFF, armazena (local ou S3) e publica o evento `diagram.created` no Kafka.
