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

**Ollama (local, sem custo de nuvem):** Requer o [Ollama](https://ollama.com) instalado com os modelos `qwen3:4b` (inferência) e `nomic-embed-text` (embeddings RAG). Veja a seção [Usando Ollama](#usando-ollama-localmente) abaixo.

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

Após os contêineres subirem, faça o pull dos modelos no contêiner do Ollama:

```bash
# Modelo de inferência (agentes de análise e orquestração)
docker compose exec ollama ollama pull qwen3:4b

# Modelo de embeddings (vector-service / RAG)
docker compose exec ollama ollama pull nomic-embed-text
```

Configure o `.env` para usar Ollama:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3:4b
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

### 3. Faça o pull dos modelos necessários

```bash
# Inferência — usado pelos agentes de análise e orquestração
ollama pull qwen3:4b

# Embeddings — usado pelo vector-service para RAG
ollama pull nomic-embed-text
```

### 4. Configure o .env

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434   # acesso ao host a partir do Docker
OLLAMA_MODEL=qwen3:4b
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
docker compose up mongo kafka zookeeper redis chromadb -d
```

### 2. Rode o serviço em modo dev

```bash
cd packages/<service-name>
npm run dev
```

Variáveis de ambiente necessárias para rodar fora do Docker (ajuste o `.env` ou exporte):

| Serviço | Variáveis adicionais |
|---|---|
| `bff` | `MONGO_URI`, `KAFKA_BROKERS`, `REDIS_URL`, `ORCHESTRATOR_URL` |
| `upload-service` | `MONGO_URI`, `KAFKA_BROKERS`, `REDIS_URL`, `AWS_*`, `STORAGE_BACKEND` |
| `processing-service` | `MONGO_URI`, `KAFKA_BROKERS`, `AWS_*` |
| `architecture-analysis-agent` | `KAFKA_BROKERS`, `AI_PROVIDER`, `ANTHROPIC_API_KEY` ou `OLLAMA_*` |
| `orchestrator-agent` | `KAFKA_BROKERS`, `OLLAMA_*`, `VECTOR_SERVICE_URL` |
| `vector-service` | `KAFKA_BROKERS`, `CHROMA_URL`, `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL` |
| `report-service` | `MONGO_URI`, `KAFKA_BROKERS` |

Para infraestrutura local (fora do Docker), use:
```env
MONGO_URI=mongodb://localhost:27017/<db-name>
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379
CHROMA_URL=http://localhost:8000
```

---

## URLs dos serviços

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| BFF | http://localhost:3001 |
| Upload Service | http://localhost:3002 |
| Vector Service | http://localhost:3006 |
| ChromaDB | http://localhost:8000 |
| Kafka | localhost:9092 |
| MongoDB | localhost:27018 |
| Redis | localhost:6379 |
| Ollama (containerizado) | http://localhost:11434 |

> `orchestrator-agent` e `architecture-analysis-agent` não expõem porta no host — são workers Kafka-native acessíveis apenas dentro da rede Docker.

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
| `AI_PROVIDER` | `claude` | Provedor de LLM: `claude` ou `ollama` |
| `ANTHROPIC_API_KEY` | — | API key da Anthropic (quando `AI_PROVIDER=claude`) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do servidor Ollama |
| `OLLAMA_MODEL` | `qwen3:4b` | Modelo de inferência do Ollama |
| `OLLAMA_TIMEOUT_MS` | `300000` | Timeout de inferência do Ollama (ms) |
| `OLLAMA_ROUTER_TIMEOUT_MS` | `45000` | Timeout do nó de roteamento no orchestrator (ms) |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Modelo de embeddings (vector-service) |
| `STORAGE_BACKEND` | `local` | Backend de armazenamento de arquivos: `local` ou `s3` |
| `AWS_ACCESS_KEY_ID` | — | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | — | Credencial AWS |
| `AWS_REGION` | `us-east-1` | Região AWS |
| `AWS_S3_BUCKET` | — | Bucket S3 para armazenamento de diagramas |
| `MONGO_URI` | URI padrão por serviço | String de conexão MongoDB |
| `KAFKA_BROKERS` | `localhost:9092` | Lista de brokers Kafka |
| `REDIS_URL` | `redis://localhost:6379` | URL do Redis |
| `CHROMA_URL` | `http://localhost:8000` | URL do ChromaDB |
| `VECTOR_SERVICE_URL` | `http://localhost:3006` | URL do vector-service (usado pelo orchestrator-agent) |
