## Infra / DevOps

### Docker Compose

O arquivo `docker-compose.yaml` na raiz do projeto orquestra todos os serviços da aplicação.

#### Serviços

| Serviço | Imagem / Build | Porta | Descrição |
|---|---|---|---|
| `zookeeper` | `confluentinc/cp-zookeeper:7.6.0` | — | Coordenação do Kafka |
| `kafka` | `confluentinc/cp-kafka:7.6.0` | 9092 | Message broker |
| `mongo` | `mongo:7.0` | 27017 | Banco de dados (compartilhado entre serviços) |
| `ollama` | `ollama/ollama:latest` | 11434 | LLM local (profile: `ollama`) |
| `orchestrator-agent` | build | 3005 | Orquestrador LangGraph — roteamento e chat com LLM |
| `diagram-extraction-agent` | build | 3003 | Extração de elementos via Claude ou Ollama |
| `architecture-analysis-agent` | build | 3004 | Análise de riscos via Claude ou Ollama |
| `bff` | build | 3001 | API Gateway |
| `upload-service` | build | 3002 | Upload de diagramas para S3 |
| `processing-service` | build | — (interno: 3001) | Tool server HTTP: OCR e rastreamento de jobs |
| `report-service` | build | — | Tool server HTTP: persistência de relatórios |
| `frontend` | build | 3000 | SPA React (servida via Nginx) |

#### Profiles

O serviço `ollama` só é iniciado quando o profile `ollama` é ativado:

```bash
docker compose --profile ollama up
```

Sem o profile, o `diagram-extraction-agent` usa Claude (`AI_PROVIDER=claude` por padrão).

#### Variáveis de ambiente injetadas

As variáveis são lidas do arquivo `.env` na raiz. Consulte `.env.example` para a lista completa.

Variáveis com fallback no compose (ex: `${AWS_REGION:-us-east-1}`) usam o valor padrão quando não definidas.

**Variáveis de conectividade entre serviços:**

| Variável | Serviço que lê | Valor no Docker | Valor recomendado em dev local |
|---|---|---|---|
| `PROCESSING_SERVICE_URL` | `diagram-extraction-agent` | `http://processing-service:3001` (fixo no compose) | `http://localhost:3005` |
| `PROCESSING_PORT` | `processing-service` | `3001` (padrão) | `3005` (evita conflito com BFF na 3001) |

> Em Docker, `PROCESSING_SERVICE_URL` é injetado diretamente no compose e não precisa estar no `.env`. Para desenvolvimento local fora do Docker, defina ambas as variáveis no `.env`.

#### Volumes

| Volume | Uso |
|---|---|
| `mongo-data` | Persistência do MongoDB |
| `ollama-data` | Cache de modelos do Ollama |

---

### AWS

#### S3
- O `upload-service` armazena os diagramas enviados em um bucket S3 via `@aws-sdk/client-s3`.
- Permissão necessária: `s3:PutObject`.
- Referência: [@aws-sdk/client-s3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/)

#### Textract
- O `processing-service` extrai texto bruto dos documentos armazenados no S3 via `@aws-sdk/client-textract`.
- Permissão necessária: `textract:DetectDocumentText`.
- Referência: [@aws-sdk/client-textract](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-textract/)

---

### Scripts utilitários

#### `scripts/reprocess-failed-reports.sh`

Reprocessa relatórios com falha republicando eventos Kafka para re-acionar o pipeline.

**Pré-requisito:** MongoDB e Kafka do Docker Compose devem estar rodando.

```bash
docker compose up -d mongo kafka
```

**Uso:**

```bash
# Simulação (sem publicar mensagens)
./scripts/reprocess-failed-reports.sh --error-code ANALYSIS_ERROR --dry-run

# Reprocessar por código de erro
./scripts/reprocess-failed-reports.sh --error-code ANALYSIS_ERROR

# Reprocessar um diagrama específico
./scripts/reprocess-failed-reports.sh --diagram-id <uuid>

# Limitar quantidade processada
./scripts/reprocess-failed-reports.sh --error-code INTERNAL_ERROR --limit 10

# Forçar re-execução completa do pipeline (republica diagram.created)
./scripts/reprocess-failed-reports.sh --error-code ANALYSIS_ERROR --from-beginning
```

**Opções disponíveis:**

| Opção | Descrição |
|---|---|
| `--error-code <code>` | Filtra relatórios pelo código de erro (ex: `ANALYSIS_ERROR`, `INTERNAL_ERROR`) |
| `--diagram-id <id>` | Reprocessa apenas o relatório do diagrama especificado |
| `--limit <n>` | Máximo de relatórios a reprocessar (padrão: 100) |
| `--dry-run` | Exibe o que seria publicado sem enviar mensagens ao Kafka |
| `--from-beginning` | Sempre republica `diagram.created`, mesmo que o job de processamento tenha sido bem-sucedido |

**Estratégia de reprocessamento:**

- Se o `ProcessingJob` existir e tiver sido bem-sucedido → republica `diagram.processed` (re-executa apenas a análise)
- Se o `ProcessingJob` falhou ou não existe → republica `diagram.created` (reinicia o pipeline completo)

---

### Pipeline CI/CD

Pipeline contendo:
- **Build:** compilação TypeScript de todos os pacotes (`lerna run build`)
- **Testes:** execução dos testes unitários (`lerna run test`)
- **Deploy (local):** `docker compose up --build`

---

### Como rodar o projeto

Consulte o [CONTRIBUTING.md](../CONTRIBUTING.md) para instruções detalhadas de setup local, incluindo configuração do Ollama.
