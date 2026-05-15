# Arquitetura
O projeto é um monorepo de microserviços e agentes de IA. A comunicação assíncrona é dividida em duas camadas:
- **Redis Streams** — gestão de jobs do pipeline de processamento de diagramas (`diagram.created`, `diagram.processed`)
- **Apache Kafka** — pipeline de análise e chat (`analysis.completed`, `chat.requested`, `chat.responded`)

A comunicação frontend ↔ BFF é a única que usa HTTP/WebSocket diretamente.

## Diagrama de Fluxo

````mermaid
flowchart TB

    %% Clients
    FE["frontend"]

    %% BFF
    BFF["bff"]

    %% Upload e Processing
    US["upload-service"]
    PS["processing-service\n(Redis Streams consumer + Textract)"]

    %% Tool Server HTTP
    RS["report-service\n(tool server)"]
    VS["vector-service\n(tool server)"]

    %% AI Agents — Kafka-native workers
    OA["orchestrator-agent (LangGraph)"]
    AAA["architecture-analysis-agent"]

    %% Databases
    DBB[("bff-db")]
    DBU[("upload-db")]
    DBP[("processing-db")]
    DBR[("report-db")]
    CHROMA[("chromadb\n(vector store)")]

    %% AWS
    S3[("AWS S3")]
    TX["AWS Textract"]

    %% Redis Streams (pipeline de processamento)
    T1(["streams:diagram:created\n(Redis Stream)"])
    T2(["streams:diagram:processed\n(Redis Stream)"])

    %% Tópicos Kafka (análise e chat)
    T3(["analysis.completed\n(Kafka)"])
    T4(["chat.requested\n(Kafka)"])
    T5(["chat.responded\n(Kafka)"])

    %% Fluxo de upload e análise
    FE -->|HTTP POST /diagrams/upload| BFF
    BFF -->|HTTP POST /upload| US
    US -->|armazena arquivo| S3
    US --> T1
    T1 --> PS
    PS -->|OCR| TX
    PS --> DBP
    PS --> T2
    T2 --> AAA
    AAA -->|HTTP POST /tools/reports| RS
    AAA --> T3
    T3 --> BFF
    T3 --> VS
    VS -->|embeddings + upsert| CHROMA

    %% Fluxo de chat
    FE <-->|WebSocket /ws/sessions/:id| BFF
    BFF --> T4
    T4 --> OA

    subgraph OrchestratorGraph ["LangGraph StateGraph"]
        Retrieval["retrieval_node (RAG)"]
        Router["router_node (LLM classifier)"]
        Conv["conversation_node"]
        Risk["risk_node"]
        Rec["recommendation_node"]

        Retrieval --> Router
        Router -->|chat| Conv
        Router -->|risk_analysis| Risk
        Router -->|recommendations| Rec
    end

    OA --> OrchestratorGraph
    OrchestratorGraph -->|GET /tools/search| VS
    VS -->|semantic search| CHROMA
    OA --> T5
    T5 --> BFF

    BFF --> DBB
    US --> DBU
    RS --> DBR
````

## Mensageria

### Redis Streams — Pipeline de Processamento de Diagramas

| Stream                       | Produtor           | Consumidor                  | Descrição                                               |
|------------------------------|--------------------|-----------------------------|---------------------------------------------------------|
| `streams:diagram:created`    | upload-service     | processing-service          | Dispara o pipeline de extração OCR após upload          |
| `streams:diagram:processed`  | processing-service | architecture-analysis-agent | Carrega texto OCR extraído para disparo da análise      |

Cada stream usa consumer groups com XREADGROUP + XACK. Mensagens não confirmadas ficam pendentes e são re-entregues ao mesmo consumer na reinicialização.

### Apache Kafka — Pipeline de Análise e Chat

| Tópico               | Produtor                    | Consumidor                  | Descrição                                                      |
|----------------------|-----------------------------|-----------------------------|----------------------------------------------------------------|
| `analysis.completed` | architecture-analysis-agent | bff, vector-service         | Atualiza status da análise no BFF e vetoriza no Chroma         |
| `chat.requested`     | bff                         | orchestrator-agent          | Envia pergunta do usuário ao orchestrator                      |
| `chat.responded`     | orchestrator-agent          | bff                         | Retorna resposta ao BFF para push via WebSocket                |

## Pipeline de Upload e Análise

```
upload-service → S3 → Redis Stream: streams:diagram:created
  ↓ Redis Stream: streams:diagram:created
processing-service → AWS Textract → MongoDB (ProcessingJob) → Redis Stream: streams:diagram:processed
  ↓ Redis Stream: streams:diagram:processed
architecture-analysis-agent → LLM (Ollama/Claude) → report-service → Kafka: analysis.completed
  ↓ Kafka: analysis.completed
BFF → WebSocket → Frontend
```

O `processing-service` consome `streams:diagram:created` via Redis Streams (XREADGROUP), chama Textract e publica `streams:diagram:processed`. O `architecture-analysis-agent` consome `streams:diagram:processed` via Redis Streams e usa o texto OCR como contexto primário para o LLM de análise, publicando `analysis.completed` no Kafka.

## Comunicação BFF ↔ Frontend (Chat)

O chat usa **WebSocket** (`ws://bff:3001/ws/sessions/:sessionId`) para comunicação bidirecional em tempo real:

1. Frontend conecta ao BFF via WebSocket ao abrir uma sessão
2. Frontend envia `{ type: "chat", question }` via WebSocket
3. BFF salva a mensagem do usuário, publica em `chat.requested`
4. Orchestrator consome, processa com LangGraph + Ollama, publica em `chat.responded`
5. BFF consome `chat.responded`, salva mensagem do assistente, envia push via WebSocket
6. Frontend recebe `{ type: "assistant_message", content, route }`

O campo de input fica bloqueado enquanto `awaitingResponse = true` para evitar acúmulo de perguntas.

## Estrutura de pastas
O projeto é um monorepo controlado por **lerna**. Todos os agentes e microserviços compartilham o mesmo repositório.

Cada serviço/agente segue Clean Architecture:
````
src/
├── application/
│   ├── use_cases/
│   └── interfaces/
├── domain/
│   ├── entities/
│   └── services/
├── infrastructure/
│   ├── api/ (routes, middleware)
│   ├── db/ (database connection)
│   ├── kafka/ (producers e consumers Kafka — análise e chat)
│   ├── redis/ (producers e consumers Redis Streams — processamento de diagramas)
│   ├── persistence/ (repository implementations)
│   └── websocket/ (BFF only)
└── interfaces/
    └── controllers/
````

## Stack
- React (TypeScript, Redux, MaterialUI)
- Node.js (TypeScript)
- MongoDB
- **Redis Streams** (ioredis ^5.3.2) — gestão de jobs de processamento de diagramas
- **Apache Kafka** (KafkaJS ^2.2) — pipeline de análise e chat
- WebSocket (ws ^8.18 — BFF)
- LangGraph (orchestrator-agent)
- Ollama / Claude API (AI inference)
- Chroma (vector store) + Ollama `nomic-embed-text` (embeddings RAG)
- AWS S3 (armazenamento de diagramas)
- AWS Textract (OCR — processado pelo processing-service)
