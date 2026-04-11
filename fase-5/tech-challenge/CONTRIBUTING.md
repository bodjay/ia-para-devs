# Contributing

## Prerequisites

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Docker | 24+ |
| Docker Compose | v2 |
| Git | — |

### Provedor de IA (escolha um)

**Claude (padrão):** Requer uma API key da Anthropic — obtenha em [console.anthropic.com](https://console.anthropic.com).

**Ollama (local, sem custo de nuvem):** Requer o [Ollama](https://ollama.com) instalado e um modelo de visão compatível. Veja a seção [Usando Ollama](#usando-ollama-localmente) abaixo.

### AWS

Os serviços de upload e processamento requerem acesso à AWS:

- **S3** — bucket para armazenamento dos arquivos de diagrama (`s3:PutObject`)
- **Textract** — extração de texto dos documentos (`textract:DetectDocumentText`)

Crie um usuário IAM com essas permissões e anote as credenciais.

---

## Configuração inicial

### 1. Clone e instale dependências

```bash
git clone <repo-url>
cd tech-challenge
npm install
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com seus valores:

```env
# Provedor de IA
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=nome-do-seu-bucket
```

---

## Rodando com Docker Compose

### Stack completa com Claude

```bash
docker compose up --build
```

### Stack completa com Ollama containerizado

```bash
docker compose --profile ollama up --build
```

Após os contêineres subirem, faça o pull do modelo de visão no contêiner do Ollama:

```bash
docker compose exec ollama ollama pull llava
```

Configure o `.env` para usar Ollama:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llava
```

> O serviço Ollama é opcional. Sem o flag `--profile ollama`, ele não é iniciado.

---

## Usando Ollama localmente

Para rodar o Ollama diretamente no host (recomendado para melhor performance com GPU):

### 1. Instale o Ollama

- **macOS / Linux:** `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows:** baixe o instalador em [ollama.com/download](https://ollama.com/download)

### 2. Suba o servidor Ollama

```bash
ollama serve
```

### 3. Faça o pull de um modelo de visão

```bash
ollama pull llava
```

Outros modelos de visão compatíveis: `llava:13b`, `llava:34b`, `bakllava`, `moondream`.

### 4. Configure o .env

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434   # acesso ao host a partir do Docker
OLLAMA_MODEL=llava
```

> `host.docker.internal` resolve para o IP do host dentro de contêineres Docker. No Linux pode ser necessário passar `--add-host host.docker.internal:host-gateway` ou usar o IP da máquina diretamente.

### 5. Suba os serviços normalmente

```bash
docker compose up --build
```

---

## Rodando serviços individualmente (modo dev)

Para desenvolver em um serviço específico sem rebuildar a imagem Docker:

### 1. Suba apenas a infraestrutura

```bash
docker compose up mongo kafka zookeeper -d
```

### 2. Rode o serviço em modo dev

```bash
cd packages/upload-service
npm run dev
```

Variáveis de ambiente necessárias para rodar fora do Docker (ajuste o `.env` ou exporte):

| Serviço | Variáveis adicionais |
|---|---|
| `upload-service` | `MONGO_URI`, `KAFKA_BROKERS`, `AWS_*` |
| `processing-service` | `MONGO_URI`, `KAFKA_BROKERS`, `EXTRACTION_AGENT_URL`, `AWS_REGION` |
| `diagram-extraction-agent` | `AI_PROVIDER`, `ANTHROPIC_API_KEY` ou `OLLAMA_*` |
| `bff` | `MONGO_URI` |
| `report-service` | `MONGO_URI`, `KAFKA_BROKERS`, `ANALYSIS_AGENT_URL` |

Para infraestrutura local (fora do Docker), use:
```env
MONGO_URI=mongodb://localhost:27017/<db-name>
KAFKA_BROKERS=localhost:9092
```

---

## URLs dos serviços

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| BFF | http://localhost:3001 |
| Upload Service | http://localhost:3002 |
| Diagram Extraction Agent | http://localhost:3003 |
| Architecture Analysis Agent | http://localhost:3004 |
| Kafka | localhost:9092 |
| MongoDB | localhost:27017 |
| Ollama (containerizado) | http://localhost:11434 |

---

## Testes

```bash
# Todos os pacotes
npm test

# Pacote específico
cd packages/upload-service && npm test

# Com cobertura
npm run test:coverage
```

---

## Referência de variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `AI_PROVIDER` | `claude` | Provedor de visão: `claude` ou `ollama` |
| `ANTHROPIC_API_KEY` | — | API key da Anthropic (quando `AI_PROVIDER=claude`) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do servidor Ollama |
| `OLLAMA_MODEL` | `llava` | Modelo de visão do Ollama |
| `AWS_ACCESS_KEY_ID` | — | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | — | Credencial AWS |
| `AWS_REGION` | `us-east-1` | Região AWS |
| `AWS_S3_BUCKET` | — | Bucket S3 para armazenamento de diagramas |
| `MONGO_URI` | URI padrão por serviço | String de conexão MongoDB |
| `KAFKA_BROKERS` | `localhost:9092` | Lista de brokers Kafka |
| `EXTRACTION_AGENT_URL` | `http://localhost:3003` | URL do diagram-extraction-agent |
| `ANALYSIS_AGENT_URL` | `http://localhost:3004` | URL do architecture-analysis-agent |
