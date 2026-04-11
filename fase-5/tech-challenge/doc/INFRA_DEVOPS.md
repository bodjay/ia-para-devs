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
| `diagram-extraction-agent` | build | 3003 | Extração de elementos via Claude ou Ollama |
| `architecture-analysis-agent` | build | 3004 | Análise de riscos via Claude |
| `bff` | build | 3001 | API Gateway |
| `upload-service` | build | 3002 | Upload de diagramas para S3 |
| `processing-service` | build | — | Consumidor Kafka: extração via Textract + agente |
| `report-service` | build | — | Consumidor Kafka: geração de relatório |
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

### Pipeline CI/CD

Pipeline contendo:
- **Build:** compilação TypeScript de todos os pacotes (`lerna run build`)
- **Testes:** execução dos testes unitários (`lerna run test`)
- **Deploy (local):** `docker compose up --build`

---

### Como rodar o projeto

Consulte o [CONTRIBUTING.md](../CONTRIBUTING.md) para instruções detalhadas de setup local, incluindo configuração do Ollama.
