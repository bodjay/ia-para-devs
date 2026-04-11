# Arquitetura
O projeto é um monorepo de microserviços e um broker (Kafka) para fluxos assíncronos. Os micro serviços se comunicam via broker, respeitando a separação de domínios.

## Diagrama
````mermaid
flowchart TB

    %% Clients
    FE["frontend"]

    %% BFF (microservice)
    BFF["bff"]

    %% Broker
    KAFKA["broker-service (Kafka)"]

    %% Microservices
    PS["process-service"]
    RS["report-service"]
    AS["analyze-service"]
    AA["architecture-agent"]

    %% Databases
    DBP[("processes")]
    DBR[("reports")]
    DBA[("analysis")]

    %% Fluxos
    FE --> BFF

    BFF --> PS
    BFF --> RS
    BFF --> AS
    
    RS --> AA

    PS --> KAFKA
    RS --> KAFKA
    AS --> KAFKA

    PS --> DBP
    RS --> DBR
    AS --> DBA
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