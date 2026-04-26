# Arquitetura
O projeto é um monorepo de microserviços e agentes de IA, usando Kafka como broker para toda a comunicação assíncrona entre serviços e agentes. A comunicação frontend ↔ BFF é a única que usa HTTP/WebSocket diretamente.

## Diagrama de Fluxo

````mermaid
flowchart TB

    %% Clients
    FE["frontend"]

    %% BFF (microservice)
    BFF["bff"]

    %% Broker
    KAFKA["broker-service (Kafka)"]

    %% Upload
    US["upload-service"]

    %% AI Agents — Kafka-native workers
    OA["orchestrator-agent (LangGraph)"]
    DEA["diagram-extraction-agent"]
    AAA["architecture-analysis-agent"]

    %% Databases
    DBB[("bff-db")]
    DBU[("upload-db")]

    %% Tópicos Kafka
    T1(["diagram.created"])
    T2(["diagram.processed"])
    T3(["analysis.completed"])
    T4(["chat.requested"])
    T5(["chat.responded"])

    %% Fluxo de upload e análise
    FE -->|HTTP POST /diagrams/upload| BFF
    BFF -->|HTTP POST /upload| US
    US --> T1
    T1 --> DEA
    DEA --> T2
    T2 --> AAA
    AAA --> T3
    T3 --> BFF

    %% Fluxo de chat
    FE <-->|WebSocket /ws/sessions/:id| BFF
    BFF --> T4
    T4 --> OA

    subgraph OrchestratorGraph ["LangGraph StateGraph"]
        Router["router_node (LLM classifier)"]
        Conv["conversation_node"]
        Risk["risk_node"]
        Rec["recommendation_node"]

        Router -->|chat| Conv
        Router -->|risk_analysis| Risk
        Router -->|recommendations| Rec
    end

    OA --> OrchestratorGraph
    OA --> T5
    T5 --> BFF

    BFF --> DBB
    US --> DBU
````

## Tópicos Kafka

| Tópico              | Produtor                   | Consumidor                     | Descrição                                      |
|---------------------|----------------------------|--------------------------------|------------------------------------------------|
| `diagram.created`   | upload-service             | diagram-extraction-agent       | Dispara extração após upload                   |
| `diagram.processed` | diagram-extraction-agent   | architecture-analysis-agent    | Dispara análise após extração                  |
| `analysis.completed`| architecture-analysis-agent| bff                            | Atualiza status da análise no BFF              |
| `chat.requested`    | bff                        | orchestrator-agent             | Envia pergunta do usuário ao orchestrator      |
| `chat.responded`    | orchestrator-agent         | bff                            | Retorna resposta ao BFF para push via WebSocket|

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
