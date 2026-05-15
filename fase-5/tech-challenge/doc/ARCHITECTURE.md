# Arquitetura
O projeto é um monorepo de microserviços e agentes de IA, usando Kafka como broker para toda a comunicação assíncrona entre serviços e agentes. A comunicação frontend ↔ BFF é a única que usa HTTP/WebSocket diretamente.

## Diagrama de Fluxo

````mermaid
flowchart TB

    %% Clients
    FE["frontend"]

    %% BFF
    BFF["bff"]

    %% Upload e Processing
    US["upload-service"]
    PS["processing-service\n(Kafka consumer + Textract)"]

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

    %% Tópicos Kafka
    T1(["diagram.created"])
    T2(["diagram.processed"])
    T3(["analysis.completed"])
    T4(["chat.requested"])
    T5(["chat.responded"])

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

## Tópicos Kafka

| Tópico              | Produtor                   | Consumidor                     | Descrição                                                                          |
|---------------------|----------------------------|--------------------------------|------------------------------------------------------------------------------------|
| `diagram.created`   | upload-service             | processing-service             | Dispara o pipeline de extração após upload                                         |
| `diagram.processed` | processing-service         | architecture-analysis-agent    | Carrega texto OCR extraído para disparo da análise                                 |
| `analysis.completed`| architecture-analysis-agent| bff, vector-service            | Atualiza status da análise no BFF e vetoriza o relatório no Chroma                 |
| `chat.requested`    | bff                        | orchestrator-agent             | Envia pergunta do usuário ao orchestrator                                          |
| `chat.responded`    | orchestrator-agent         | bff                            | Retorna resposta ao BFF para push via WebSocket                                    |

## Pipeline de Upload e Análise

```
upload-service → S3 → Kafka: diagram.created
  ↓ Kafka: diagram.created
processing-service → AWS Textract → MongoDB (ProcessingJob) → Kafka: diagram.processed
  ↓ Kafka: diagram.processed
architecture-analysis-agent → LLM (Ollama/Claude) → report-service → Kafka: analysis.completed
  ↓ Kafka: analysis.completed
BFF → WebSocket → Frontend
```

O `processing-service` é Kafka-native: consome `diagram.created`, chama Textract diretamente e publica `diagram.processed` com o texto extraído. O `architecture-analysis-agent` usa esse texto como contexto primário para o LLM de análise.

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
│   ├── kafka/ (producers, consumers)
│   ├── persistence/ (repository implementations)
│   └── websocket/ (BFF only)
└── interfaces/
    └── controllers/
````

## Stack
- React (TypeScript, Redux, MaterialUI)
- Node.js (TypeScript)
- MongoDB
- Apache Kafka (KafkaJS ^2.2)
- WebSocket (ws ^8.18 — BFF)
- LangGraph (orchestrator-agent)
- Ollama / Claude API (AI inference)
- Chroma (vector store) + Ollama `nomic-embed-text` (embeddings RAG)
- AWS S3 (armazenamento de diagramas)
- AWS Textract (OCR — processado pelo processing-service)
