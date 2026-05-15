# diagram-extraction-agent — DEPRECIADO

Este agente foi removido do projeto. A responsabilidade de extração de texto de diagramas foi absorvida pelo **`processing-service`**, que chama diretamente o **AWS Textract** após consumir o evento `diagram.created`.

Consulte a seção `processing-service` em [BACKEND.md](../BACKEND.md) para detalhes do fluxo atual.
