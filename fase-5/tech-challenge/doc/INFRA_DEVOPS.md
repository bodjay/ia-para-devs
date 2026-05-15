## Infra / DevOps

### Docker Compose

O arquivo `docker-compose.yaml` na raiz do projeto orquestra todos os serviços da aplicação.

#### Serviços

| Serviço | Imagem / Build | Porta | Descrição |
|---|---|---|---|
| `zookeeper` | `confluentinc/cp-zookeeper:7.6.0` | — | Coordenação do Kafka |
| `kafka` | `confluentinc/cp-kafka:7.6.0` | 9092 | Message broker |
| `mongo` | `mongo:7.0` | 27018→27017 | Banco de dados |
| `redis` | `redis:7-alpine` | 6379 | Upload tokens + sessões WebSocket + Redis Streams (processamento de diagramas) |
| `chromadb` | `chromadb/chroma:latest` | 8000 | Vector store para RAG |
| `ollama` | `ollama/ollama:latest` | 11434 | LLM local (profile: `ollama`) |
| `orchestrator-agent` | build | 3005 (interno) | Orquestrador LangGraph — roteamento e chat com LLM |
| `architecture-analysis-agent` | build | — | Análise de riscos via Claude ou Ollama |
| `bff` | build | 3001 | API Gateway |
| `upload-service` | build | 3002 | Upload de diagramas para S3 |
| `processing-service` | build | — (interno: 3001) | Redis Streams consumer: OCR via Textract + publica streams:diagram:processed |
| `report-service` | build | — | Tool server HTTP: persistência de relatórios |
| `vector-service` | build | 3006 | Embeddings + busca semântica (ChromaDB) |
| `frontend` | build | 3000 | SPA React (servida via Nginx) |

#### Profiles

O serviço `ollama` só é iniciado quando o profile `ollama` é ativado:

```bash
docker compose --profile ollama up
```

Sem o profile, use `AI_PROVIDER=claude` para os agentes usarem a Claude API.

#### Variáveis de ambiente injetadas

As variáveis são lidas do arquivo `.env` na raiz. Consulte `.env.example` para a lista completa.

Variáveis com fallback no compose (ex: `${AWS_REGION:-us-east-1}`) usam o valor padrão quando não definidas.

#### Volumes

| Volume | Uso |
|---|---|
| `mongo-data` | Persistência do MongoDB |
| `uploads-data` | Arquivos em modo local (quando `STORAGE_BACKEND=local`) |
| `ollama-data` | Cache de modelos do Ollama |
| `chroma-data` | Índices vetoriais do ChromaDB |
| `redis-data` | Persistência do Redis |

---

### AWS

#### S3
- O `upload-service` armazena os diagramas enviados em um bucket S3 via `@aws-sdk/client-s3`.
- Permissão necessária: `s3:PutObject`.
- Referência: [@aws-sdk/client-s3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/)

#### Textract
- O `processing-service` extrai texto dos documentos armazenados no S3 via `@aws-sdk/client-textract`.
- Permissão necessária: `textract:DetectDocumentText`.
- Referência: [@aws-sdk/client-textract](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-textract/)

---

### Scripts utilitários

#### `scripts/reprocess-failed-reports.ts`

Reprocessa relatórios com falha publicando eventos nos Redis Streams para re-acionar o pipeline.

**Pré-requisito:** MongoDB e Redis do Docker Compose devem estar rodando.

```bash
docker compose up -d mongo redis
```

**Uso:**

```bash
# Simulação (sem publicar mensagens)
ts-node scripts/reprocess-failed-reports.ts --error-code ANALYSIS_ERROR --dry-run

# Reprocessar por código de erro
ts-node scripts/reprocess-failed-reports.ts --error-code ANALYSIS_ERROR

# Reprocessar um diagrama específico
ts-node scripts/reprocess-failed-reports.ts --diagram-id <uuid>

# Limitar quantidade processada
ts-node scripts/reprocess-failed-reports.ts --error-code INTERNAL_ERROR --limit 10

# Forçar re-execução completa do pipeline (publica em streams:diagram:created)
ts-node scripts/reprocess-failed-reports.ts --error-code ANALYSIS_ERROR --from-beginning
```

**Opções disponíveis:**

| Opção | Descrição |
|---|---|
| `--error-code <code>` | Filtra relatórios pelo código de erro (ex: `ANALYSIS_ERROR`, `INTERNAL_ERROR`) |
| `--diagram-id <id>` | Reprocessa apenas o relatório do diagrama especificado |
| `--limit <n>` | Máximo de relatórios a reprocessar (padrão: 100) |
| `--dry-run` | Exibe o que seria publicado sem enviar mensagens ao Redis |
| `--from-beginning` | Sempre publica em `streams:diagram:created`, mesmo que o job de processamento tenha sido bem-sucedido |

**Estratégia de reprocessamento:**

- Se o `ProcessingJob` existir e tiver sido bem-sucedido → publica em `streams:diagram:processed` (re-executa apenas a análise)
- Se o `ProcessingJob` falhou ou não existe → publica em `streams:diagram:created` (reinicia o pipeline completo)

---

### Pipeline CI/CD

Pipeline contendo:
- **Build:** compilação TypeScript de todos os pacotes (`lerna run build`)
- **Testes:** execução dos testes unitários (`lerna run test`)
- **Deploy (local):** `docker compose up --build`

---

### Como rodar o projeto

Consulte o [CONTRIBUTING.md](../CONTRIBUTING.md) para instruções detalhadas de setup local, incluindo configuração do Ollama.
