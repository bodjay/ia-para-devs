## Qualidade e Observabilidade

### Logs Estruturados

Todos os microserviços e agentes utilizam a classe `Logger` do pacote `@arch-analyzer/common` para emissão de logs em formato **JSON por linha** (NDJSON).

**Formato de cada entrada:**
```json
{
  "level": "INFO | WARN | ERROR",
  "timestamp": "ISO-8601",
  "logger": "<nome-do-serviço>",
  "message": "<mensagem>",
  "<campo>": "<valor contexto adicional>"
}
```

**Roteamento de saída:**
- `INFO` → `stdout`
- `WARN` / `ERROR` → `stderr`

**Uso nos serviços:**
```ts
import { Logger } from '@arch-analyzer/common';

const logger = new Logger('meu-servico');
logger.info('Evento recebido', { diagramId, sessionId });
logger.warn('Retry detectado', { attempt: 3 });
logger.error('Falha ao processar', { error: err.message, stack: err.stack });
```

O campo `logger` identifica qual serviço gerou a entrada. Campos extras passados no segundo argumento são mesclados diretamente na raiz do JSON, permitindo indexação direta por qualquer campo de contexto.

---

### Tratamento de Erros

- Consumers Redis Streams e Kafka envolvem o processamento em `try/catch`. Falhas registram o erro via `logger.error` e fazem ACK da mensagem (ou deixam pendente para re-entrega conforme política do consumer group).
- Endpoints HTTP possuem middleware de erro centralizado que retorna `{ error: "InternalServerError", message: "..." }` com status 500.
- O `architecture-analysis-agent` registra `status: "failed"` no relatório e publica `analysis.completed` com o erro para o BFF atualizar o status da análise.

---

### Testes Unitários

Cada pacote possui suite de testes acessível via:

```bash
lerna run test          # todos os pacotes
lerna run test:coverage # com cobertura
```

Os testes são executados no pipeline CI antes do build Docker.
