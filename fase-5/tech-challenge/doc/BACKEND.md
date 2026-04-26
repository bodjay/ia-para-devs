## Microserviços

Cada serviço possúi banco de dados próprio e testes automatizados.

> **Nota:** `processing-service` e `report-service` foram removidos. Suas responsabilidades foram absorvidas pelos agentes `diagram-extraction-agent` e `architecture-analysis-agent`, que agora são Kafka-native workers (consomem e publicam diretamente nos tópicos).

### Serviços ativos

- [serviço de api-gateway bff](@services/bff.md)
- [Serviço que lida com o upload de arquivo (upload-service)](@services/upload-service.md)

### bff

API Gateway e ponto único de entrada para o frontend. Responsabilidades:
- Receber upload de diagrama e encaminhar ao `upload-service` via HTTP
- Consumir `analysis.completed` para atualizar o status da análise no MongoDB
- Manter conexões WebSocket com o frontend para o fluxo de chat
- Publicar `chat.requested` e consumir `chat.responded` para orquestrar o chat via Kafka

### upload-service

Recebe o arquivo do BFF, armazena (local ou S3) e publica o evento `diagram.created` no Kafka.
