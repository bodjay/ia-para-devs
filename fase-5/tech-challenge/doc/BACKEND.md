## Microserviços

Cada serviço possui banco de dados próprio e testes automatizados.

### Serviços ativos

- [serviço de api-gateway bff](@services/bff.md)
- [Serviço que lida com o upload de arquivo (upload-service)](@services/upload-service.md)

### processing-service

Serviço **Redis Streams-native** responsável por acionar o OCR via AWS Textract e publicar o resultado na pipeline de análise.

- **Porta:** sem porta exposta (serviço interno)
- **Redis Stream consumer:** `streams:diagram:created` (group: `processing-service-group`)
- **Redis Stream producer:** `streams:diagram:processed`
- **Banco:** MongoDB (`arch-analyzer-processing`)
- **AWS:** Textract via `@aws-sdk/client-textract`

**Fluxo:**
1. Consome `streams:diagram:created` via XREADGROUP (Redis Streams)
2. Chama AWS Textract para extração de texto do arquivo em S3
3. Persiste `ProcessingJob` no MongoDB
4. Publica `streams:diagram:processed` com o texto OCR extraído via XADD

**Endpoints HTTP (debug/utilitário):**
- `POST /tools/ocr` — `{ s3Url }` → executa Textract → `{ extractedText }`
- `POST /tools/jobs` — `{ diagramId }` → cria ProcessingJob → `{ jobId }`
- `PUT /tools/jobs/:id` — atualiza status/resultado do job

**Schema de `DiagramElement`** (campo `elements` do evento `diagram.processed`):

```ts
{
  id: string;
  type: 'microservice' | 'database' | 'broker' | 'client' | 'unknown';
  label: string;
  position: { x: number; y: number };
}
```

### report-service

Tool server HTTP para persistência de relatórios gerados pelo `architecture-analysis-agent`.

- **Porta:** sem porta exposta (serviço interno, chamado apenas pelo `architecture-analysis-agent`)
- **Banco:** MongoDB (`arch-analyzer-reports`)
- **Endpoints:**
  - `POST /tools/reports` — recebe `AnalysisCompletedEvent` → cria/atualiza Report → `{ reportId }`

---

### architecture-analysis-agent

Consome `streams:diagram:processed` via **Redis Streams** (XREADGROUP, group: `analysis-agent-group`), executa análise LLM e publica `analysis.completed` via **Kafka**.

---

### orchestrator-agent

Agente **Kafka-native** com servidor HTTP. Roteador de chat usando LangGraph StateGraph com RAG.

- **Porta:** `3005` (interno — sem porta exposta no host; acessado pelo BFF via `http://orchestrator-agent:3005`)
- **Kafka consumer:** `chat.requested` (group: `orchestrator-agent-group`)
- **Kafka producer:** `chat.responded`
- **Endpoints HTTP:**
  - `POST /analysis/chat` — `{ question, analysisContext, history }` → `{ response, route }` (fallback HTTP)
  - `POST /context/export` — `{ sessionName, analysis, conversationTopics }` → `{ text }` (gera prompt para Claude Code)

### vector-service

Tool server HTTP para busca semântica. Vetoriza relatórios de análise e serve queries RAG.

- **Porta:** `3006`
- **Kafka consumer:** `analysis.completed` — gera embeddings e upserta no ChromaDB
- **Banco:** ChromaDB (`arch-analyzer-vectors`)
- **Endpoints:**
  - `GET /tools/search?q=<query>` — busca semântica → retorna chunks com score ≤ 0.6

### bff

API Gateway e ponto único de entrada para o frontend. Responsabilidades:
- Receber upload de diagrama e encaminhar ao `upload-service` via HTTP
- Consumir `analysis.completed` para atualizar o status da análise no MongoDB
- Manter conexões WebSocket com o frontend para o fluxo de chat
- Publicar `chat.requested` e consumir `chat.responded` para orquestrar o chat via Kafka

### upload-service

Recebe o arquivo do BFF, armazena (local ou S3) e publica o evento no stream `streams:diagram:created` via **Redis Streams** (XADD).
