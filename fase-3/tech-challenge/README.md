# Tech Challenge 3

## Descrição

Este projeto faz parte do Tech Challenge 3 e foi desenvolvido para demonstrar a aplicação de técnicas avançadas de inteligência artificial e aprendizado de máquina. Ele inclui agentes inteligentes, ferramentas de processamento de documentos e modelos de classificação, entre outros componentes.

## Ajuste fino

[Tech Challenge 3 - Google Colab](https://colab.research.google.com/drive/1KgwTaTklZjaGo9vz4l5QCVsTTMVy1w1O?usp=sharing)

## Estrutura do Projeto

A estrutura do projeto está organizada da seguinte forma:

- **src/**: Contém o código-fonte principal do projeto.
  - **agents/**: Implementações de agentes inteligentes, como assistentes de saúde, classificadores e fluxos de trabalho.
  - **entities/**: Definições de entidades usadas pelos agentes e serviços.
  - **models/**: Modelos utilizados para armazenamento e recuperação de dados.
  - **services/**: Serviços para carregamento, divisão e manipulação de documentos.
  - **tools/**: Ferramentas específicas para tarefas como recuperação de documentos.
- **examples/**: Exemplos de uso do projeto.
- **package.json**: Gerenciamento de dependências do projeto.
- **tsconfig.json**: Configuração do TypeScript.

## Como Executar

1. Certifique-se de ter o Node.js instalado em sua máquina.
2. Instale as dependências do projeto executando o comando:
   ```bash
   npm install
   ```
3. Para iniciar o projeto em modo de desenvolvimento, execute:
   ```bash
   npm run start:dev
   ```

### Exemplos
Utilize  as seguintes questões para executar os multi agentes:
```sh
1. How to prevent Deep Vein Thrombosis? # Executa o agente responsável por auxiliar em perguntas frequentes dos médicos, utilizando o modelo treinado na etapa 1.

2. My name is Joe, book me an appointment for tomorrow. # Executa o agente que gerencia as consultas.

3. Why AI Still Isn’t Fixing Patient Referrals—And How It Could # Executa o agente de midia social, responsável por consultar um blog de healthcare e resumir suas manchetes.
```

## Licença

Este projeto está licenciado sob os termos especificados no arquivo `CITATION.cff`.