# Tech Challenge — Fase 5

Equipes de engenharia que operam sistemas distribuídos acumulam dezenas de diagramas de arquitetura — armazenados como imagens ou PDFs — usados em revisões arquiteturais, auditorias de segurança, avaliações de escalabilidade e discussões técnicas entre times. Analisar esses diagramas é um processo manual, lento, dependente de especialistas e que não escala.

Este projeto resolve esse problema. Envie um diagrama de arquitetura de software e receba automaticamente uma análise técnica com identificação de componentes, relações entre serviços, riscos arquiteturais (single point of failure, alto acoplamento, falta de redundância) e recomendações de melhoria. Um chat interativo permite aprofundar a análise com perguntas contextuais sobre o diagrama — útil para onboarding de novos membros, preparação para auditorias e avaliação de escalabilidade.

## Como funciona

O diagrama é enviado via upload, processado por OCR (AWS Textract) e analisado por um agente LLM. O resultado fica disponível como relatório estruturado e como base de conhecimento para o chat, que usa RAG (ChromaDB + embeddings) para responder perguntas com contexto semântico.

```
Upload → S3 → Redis Streams → OCR (Textract) → Redis Streams
  → architecture-analysis-agent (LLM) → Kafka
    → BFF (WebSocket → Frontend) + vector-service (ChromaDB)
       → orchestrator-agent (LangGraph + RAG) → chat em tempo real
```

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [Escopo](doc/SCOPE.md) | Problema, solução e objetivos do projeto |
| [Casos de Uso](doc/USE_CASE.md) | Regras de negócio e fluxos dos usuários |
| [Arquitetura](doc/ARCHITECTURE.md) | Diagrama de fluxo, mensageria, estrutura de pastas e stack |
| [Agentes de IA](doc/AGENTS.md) | Comportamento e responsabilidades dos agentes |
| [Frontend](doc/FRONTEND.md) | SPA React, fluxos de UX e componentes |
| [Backend](doc/BACKEND.md) | Microserviços e suas responsabilidades |
| [Infra / DevOps](doc/INFRA_DEVOPS.md) | Docker, variáveis de ambiente e pipeline CI/CD |
| [Qualidade e Observabilidade](doc/QUALITY_OBSERVABILITY.md) | Logs estruturados, testes e práticas de qualidade |

### Serviços e agentes

| Documento | Descrição |
|-----------|-----------|
| [BFF](doc/services/bff.md) | Backend for Frontend — API HTTP + WebSocket |
| [upload-service](doc/services/upload-service.md) | Recepção de diagramas e armazenamento no S3 |
| [processing-service](doc/services/processing-server.md) | OCR via AWS Textract e publicação no Redis Stream |
| [report-service](doc/services/report-service.md) | Tool server para persistência de relatórios |
| [architecture-analysis-agent](doc/agents/architecture-analysis-agent.md) | Agente LLM de análise arquitetural |
| [orchestrator-agent](doc/agents/orchestrator-agent.md) | Agente LangGraph para chat contextual (RAG) |

## Processo de desenvolvimento

### Spec Driven Development

O projeto foi desenvolvido seguindo o método **Spec Driven Development (SDD)**: antes de qualquer linha de código, toda a solução foi especificada em documentos de escopo, casos de uso, contratos de API, fluxos de mensageria e comportamento dos agentes. Esses artefatos funcionaram como a fonte de verdade durante o desenvolvimento — cada microserviço, agente e componente de frontend foi implementado a partir de uma especificação previamente validada.

Esse método reduziu retrabalho, tornou as decisões arquiteturais explícitas e rastreáveis, e permitiu que o assistente de IA (descrito abaixo) gerasse código aderente ao design sem ambiguidade.

### Assistente de IA — Claude Code

Todo o desenvolvimento foi conduzido com o suporte do **Claude Code**, assistente de IA da Anthropic baseado no modelo Claude Sonnet. O assistente atuou como par de programação ao longo de todo o projeto: geração e refatoração de código, escrita e revisão da documentação, análise de arquitetura, depuração e implementação de features completas.

A combinação de SDD com Claude Code permitiu um ciclo de desenvolvimento em que as especificações guiavam as instruções ao assistente, e o assistente executava com precisão dentro dos limites definidos — tornando o processo mais rápido, rastreável e consistente.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React, TypeScript, Redux, Material UI |
| Backend | Node.js, TypeScript |
| Banco de dados | MongoDB |
| Mensageria — jobs | Redis Streams (ioredis) |
| Mensageria — análise/chat | Apache Kafka (KafkaJS) |
| Comunicação em tempo real | WebSocket (ws) |
| IA — orquestração | LangGraph |
| IA — inferência | Ollama / Claude API |
| IA — busca semântica | ChromaDB + `nomic-embed-text` |
| Cloud | AWS S3, AWS Textract |

---

## Agradecimentos

Este projeto é o resultado final da especialização **IA para Devs** da **FIAP**. Ao longo de toda a trajetória, contei com o suporte, a dedicação e o conhecimento de pessoas que fizeram toda a diferença.

Agradeço aos **professores da FIAP** pelo cuidado na curadoria do conteúdo, pela disponibilidade e pelo entusiasmo em transmitir o que há de mais atual no campo da inteligência artificial aplicada ao desenvolvimento de software.

Agradeço também aos **colegas e amigos** que compartilharam essa jornada — pelas trocas, pelos projetos em conjunto, pelas discussões técnicas e pelo incentivo nos momentos difíceis. A caminhada foi muito mais rica por ter sido feita ao lado de vocês.
