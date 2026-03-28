
## Casos de uso

## 1. Upload e análise de diagrama
**User Story:**  
Como **engenheiro de software**, quero **enviar um diagrama de arquitetura**, para **receber uma análise técnica automática**.

**Critérios de aceitação:**
- Deve permitir upload de imagem ou PDF  
- Deve processar o arquivo automaticamente  
- Deve retornar:
  - Componentes identificados  
  - Relações entre serviços  
  - Padrões arquiteturais (quando possível)  

---

## 2. Conversa interativa sobre o diagrama
**User Story:**  
Como **usuário técnico**, quero **fazer perguntas sobre o diagrama enviado**, para **aprofundar a análise**.

**Critérios de aceitação:**
- Deve permitir envio de mensagens via chat  
- Deve responder com base no diagrama da sessão  
- Deve manter o contexto da conversa  

---

## 3. Identificação de riscos arquiteturais
**User Story:**  
Como **arquiteto de software**, quero **identificar riscos automaticamente**, para **antecipar problemas no sistema**.

**Critérios de aceitação:**
- Deve detectar:
  - Single point of failure  
  - Falta de redundância  
  - Alto acoplamento  
- Deve explicar cada risco encontrado  

---

## 4. Recomendações de melhoria
**User Story:**  
Como **engenheiro**, quero **receber recomendações de arquitetura**, para **melhorar o sistema**.

**Critérios de aceitação:**
- Deve sugerir boas práticas  
- Deve propor melhorias de escalabilidade  
- Deve justificar cada recomendação  

---

## 5. Comparação entre diagramas
**User Story:**  
Como **arquiteto**, quero **comparar diferentes diagramas**, para **avaliar alternativas arquiteturais**.

**Critérios de aceitação:**
- Deve permitir múltiplas sessões  
- Deve comparar dois diagramas  
- Deve destacar diferenças e impactos  

---

## 6. Histórico de sessões
**User Story:**  
Como **usuário**, quero **acessar análises anteriores**, para **revisar decisões passadas**.

**Critérios de aceitação:**
- Deve listar sessões na lateral  
- Deve permitir reabrir sessões  
- Deve manter histórico de mensagens  

---

## 7. Apoio ao onboarding
**User Story:**  
Como **novo membro do time**, quero **entender rapidamente a arquitetura**, para **começar a contribuir mais rápido**.

**Critérios de aceitação:**
- Deve gerar explicação clara do diagrama  
- Deve permitir perguntas simples  
- Deve adaptar respostas para diferentes níveis técnicos  

---

## 8. Preparação para auditorias
**User Story:**  
Como **analista de segurança**, quero **avaliar rapidamente riscos do sistema**, para **me preparar para auditorias**.

**Critérios de aceitação:**
- Deve identificar riscos de segurança  
- Deve gerar um resumo estruturado  
- Deve permitir perguntas específicas  

---

## 9. Geração de documentação técnica
**User Story:**  
Como **engenheiro**, quero **gerar documentação a partir do diagrama**, para **economizar tempo**.

**Critérios de aceitação:**
- Deve gerar descrição textual da arquitetura  
- Deve organizar em seções (componentes, fluxos, etc.)  
- Deve ser exportável (copiar/download)  

---

## 10. Avaliação de escalabilidade
**User Story:**  
Como **arquiteto de sistemas**, quero **avaliar a escalabilidade da arquitetura**, para **garantir crescimento sustentável**.

**Critérios de aceitação:**
- Deve analisar gargalos  
- Deve considerar distribuição de carga  
- Deve fornecer recomendações práticas  

---

## 11. Processamento de diagramas (técnica)
**User Story:**  
Como **sistema**, quero **interpretar diagramas visuais**, para **extrair informações estruturadas**.

**Critérios de aceitação:**
- Deve reconhecer elementos (serviços, bancos, APIs)  
- Deve identificar conexões  
- Deve lidar com diferentes formatos de imagem  