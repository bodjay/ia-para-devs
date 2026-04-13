# Arquitetura
O projeto é um monorepo de microserviços e um broker (Kafka) para fluxos assíncronos. Os micro serviços se comunicam via broker, respeitando a separação de domínios.

## Diagrama
````mermaid
flowchart TB

    %% Clients
    FE["frontend"]

    %% BFF (microservice)
    BFF["bff"]

    %% Orchestrator
    OA["orchestrator-agent (LangGraph)"]

    %% Broker
    KAFKA["broker-service (Kafka)"]

    %% Microservices
    PS["processing-service"]
    RS["report-service"]
    US["upload-service"]

    %% AI Agents
    DEA["diagram-extraction-agent"]
    AAA["architecture-analysis-agent"]

    %% Databases
    DBB[("bff-db")]
    DBP[("processing-db")]
    DBR[("report-db")]
    DBU[("upload-db")]

    %% Fluxos
    FE --> BFF
    BFF -->|POST /analysis/chat| OA

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

    BFF --> US
    US --> KAFKA
    KAFKA --> PS
    PS --> DEA
    PS --> KAFKA
    KAFKA --> RS
    RS --> AAA
    RS --> KAFKA
    KAFKA --> BFF

    BFF --> DBB
    PS --> DBP
    RS --> DBR
    US --> DBU
````

##  Estrutura de pastas
O projeto deve ser um monorepo, e deve utilizar 'lerna (https://github.com/lerna/lerna)' como controlador de versionamento.
Tanto os agentes quanto os micro serviços devem estar no mesmo repositório.

O cada microserviço deve seguir a arquitetura climpa (Clean Architecture).
````
src/
├── application/
│   ├── use_cases/
│   └── interfaces/ (e.g., UserRepositoryInterface.ts)
├── domain/
│   ├── entities/
│   └── services/ (core business logic)
├── infrastructure/
│   ├── api/ (routes, middleware)
│   ├── db/ (database connection and setup)
│   └── persistence/ (repository implementations, e.g., UserRepository.ts)
└── interfaces/
    └── controllers/
````


## Stack
- React (Typescript (https://github.com/microsoft/Typescript), Redux (https://github.com/reduxjs/redux), MaterialUI (https://github.com/mui/material-ui))
- Node (Typescript (https://github.com/microsoft/Typescript))
- MongoDB (https://github.com/mongodb/mongo)
- Apache Kafka (https://github.com/apache/kafka)