
## Frontend

Projeto client-side, web, SPA que faz interface com os serviços via BFF.

### Stack técnica
- **React 18** (TypeScript) com **Vite**
- **Redux Toolkit** — gerenciamento de estado global (slices: `analysisSlice`, `chatSlice`, `sessionsSlice`)
- **Material-UI (MUI)** — componentes visuais
- **WebSocket** (`ChatWebSocketClient`) — canal bidirecional para mensagens de chat em tempo real
- **HTTP REST** (`bffClient`) — upload, sessões, histórico de mensagens e polling de análise

### Polling de análise
Após o upload, o frontend inicia polling no endpoint `GET /api/analysis/:id` com intervalo de **3 segundos** e máximo de **120 tentativas** (~6 minutos). Se o status retornar `completed`, exibe o resultado. Se `failed`, exibe o erro.

### Layout
A interface possui **sidebars colapsáveis** (esquerda: lista de sessões + busca; direita: barra de relatório de análise). Ambas podem ser recolhidas individualmente para ampliar a área de chat.

# Fluxo de UX — Análise de Diagramas de Arquitetura

## 1. Entrada no sistema
**Objetivo:** permitir acesso rápido às análises

### Fluxo:
1. Usuário acessa a aplicação
2. Visualiza:
   - Sidebar com sessões anteriores
   - Campo de busca
   - Área principal (chat vazio ou última sessão aberta)
3. Sistema:
   - Carrega automaticamente a última sessão utilizada (se existir)

---

## 2. Criação de nova sessão
**Objetivo:** iniciar uma nova análise

### Fluxo:
1. Usuário clica em “Nova Sessão” ou começa a interagir no input
2. Sistema:
   - Cria uma nova sessão na sidebar (ex: “Sessão 2”)
   - Foca automaticamente no campo de entrada

---

## 3. Upload do diagrama
**Objetivo:** enviar o artefato para análise

### Fluxo:
1. Usuário:
   - Arrasta e solta um arquivo **ou**
   - Clica no input para anexar imagem/PDF
2. Sistema:
   - Exibe estado de upload (loading)
   - Valida formato do arquivo
3. Em caso de erro:
   - Exibe mensagem: “Formato não suportado”
4. Em caso de sucesso:
   - Mostra preview do arquivo enviado

---

## 4. Processamento e análise inicial
**Objetivo:** gerar análise automática

### Fluxo:
1. Sistema inicia processamento
2. Exibe indicador de “Analisando diagrama...”
3. Após processamento:
   - Exibe resposta no chat contendo:
     - Componentes identificados
     - Relações entre serviços
     - Possíveis padrões
     - Riscos iniciais

---

## 5. Interação via chat
**Objetivo:** permitir exploração contínua

### Fluxo:
1. Usuário digita pergunta no campo inferior
   - Ex: “Quais são os gargalos?”
2. Clica em enviar (ícone de seta)
3. Sistema:
   - Processa pergunta considerando contexto
   - Retorna resposta no chat
4. Conversa continua de forma iterativa

---

## 6. Navegação entre sessões
**Objetivo:** acessar análises anteriores

### Fluxo:
1. Usuário clica em uma sessão na sidebar
2. Sistema:
   - Carrega histórico completo (mensagens + arquivos)
   - Atualiza área principal
3. Usuário pode:
   - Continuar conversa
   - Fazer novas perguntas

---

## 7. Busca de sessões
**Objetivo:** encontrar análises rapidamente

### Fluxo:
1. Usuário digita no campo “Buscar”
2. Sistema:
   - Filtra sessões em tempo real
3. Usuário seleciona resultado desejado

---

## 8. Comparação entre diagramas (fluxo avançado)
**Objetivo:** analisar diferenças arquiteturais

### Fluxo:
1. Usuário abre uma sessão
2. Envia um segundo diagrama **ou**
   - Referencia outra sessão
3. Solicita comparação
4. Sistema:
   - Analisa ambos os diagramas
   - Retorna:
     - Diferenças estruturais
     - Impactos
     - Recomendações

---

## 9. Geração de documentação
**Objetivo:** transformar análise em texto estruturado

### Fluxo:
1. Usuário solicita:
   - “Gerar documentação”
2. Sistema:
   - Organiza resposta em seções:
     - Visão geral
     - Componentes
     - Fluxos
     - Riscos
3. Usuário pode:
   - Copiar conteúdo
   - Exportar (futuro)

---

## 10. Estados do sistema

### Estados principais:
- Idle (sem interação)
- Uploading (enviando arquivo)
- Processing (analisando)
- Responding (gerando resposta)
- Error (falha)

### Feedback visual:
- Loading indicators
- Mensagens de erro claras
- Destaque de mensagens recentes

---

## 11. Tratamento de erros

### Cenários:
- Arquivo inválido
- Falha no processamento
- Timeout

### Respostas:
- Mensagem clara
- Sugestão de ação (ex: “tente outro arquivo”)

---

## 12. Encerramento da sessão
**Objetivo:** manter continuidade

### Fluxo:
1. Usuário sai da aplicação
2. Sistema:
   - Salva automaticamente sessão e histórico
3. Ao retornar:
   - Restaura última sessão ativa

---

# 🧠 Resumo da experiência
- Entrada simples (chat-first)
- Upload como ação central
- Conversa contínua e contextual
- Histórico persistente
- Foco em produtividade técnica