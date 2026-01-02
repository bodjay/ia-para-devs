Entregas técnicas:

1. Fine-tuning de LLM com dados médicos internos
    ● Realizar o fine-tuning de um modelo LLM (como LLaMA, Falcon ou um outro) utilizando:
        ○ Protocolos médicos do hospital;
        ○ Exemplos de perguntas frequentes feitas por médicos;
        ○ Modelos de laudos, receitas e procedimentos internos.
    ● Preparar os dados com técnicas de preprocessing, anonimização e curadoria.

2. Criação de assistente médico com LangChain
    ● Utilizar o LangChain para:
        ○ Construir um pipeline que integre a LLM customizada;
        ○ Realizar consultas em base de dados estruturadas (como prontuários e registros);
        ○ Contextualizar as respostas da LLM com informações atualizadas do paciente.

3. Segurança e validação
        ● Definir os limites de atuação do assistente para evitar sugestões impróprias (exemplo: nunca prescrever diretamente, sem a validação humana);
        ● Implementar logging detalhado para rastreamento e auditoria;
PRONTO  ● Garantir explainability das respostas da LLM (exemplo: =indicar a fonte da informação utilizada na resposta).

4. Organização do código
    ● Projeto modularizado em Python;
    ● Instruções completas no README.