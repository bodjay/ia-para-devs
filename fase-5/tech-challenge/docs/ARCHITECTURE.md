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

    %% Databases
    DBP[("processes")]
    DBR[("reports")]
    DBA[("analysis")]

    %% Fluxos
    FE <--> BFF

    BFF --> PS
    BFF --> RS
    BFF --> AS

    PS --> KAFKA
    RS --> KAFKA
    AS --> KAFKA

    PS --> DBP
    RS --> DBR
    AS --> DBA
````

Cada serviço possúi:
- Banco de dados próprio
- Testes automatizados

## Stack
- React (Typescript (https://github.com/microsoft/Typescript), Redux (https://github.com/reduxjs/redux), MaterialUI (https://github.com/mui/material-ui))
- Node (Typescript (https://github.com/microsoft/Typescript))
- MongoDB (https://github.com/mongodb/mongo)
- Apache Kafka (https://github.com/apache/kafka)