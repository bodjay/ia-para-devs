# Tech Challenge 2

Quebra-cabeça de encaixe resolvido com algoritmo genético, usando seleção por torneio, cruzamento e mutação. O projeto é um monorepo com um módulo genético genérico, separado do jogo, e um pacote com o quebra-cabeça.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript 5 sobre Node.js 20 |
| Monorepo | npm workspaces |
| Servidor | Express 4, com progresso transmitido por Server-Sent Events |
| Interface | HTML, CSS e JavaScript puros, sem framework. Peças desenhadas em SVG e gráfico em Canvas |
| Testes | Jest com ts-jest |

Nenhuma biblioteca de algoritmo genético foi usada. População, seleção por torneio, cruzamento, mutação, elitismo, reinício por estagnação e hotstart foram implementados do zero no pacote `packages/genetic`, assim como o gerador aleatório com semente usado nos testes.

## Requisitos

- Node.js 20 ou superior.

## Como executar

Instale as dependências na raiz do projeto.

```bash
npm install
```

Compile e inicie o servidor.

```bash
npm run dev
```

Acesse `http://localhost:3000`, selecione um tabuleiro e clique em **Resolver**.

Para usar outra porta, defina a variável `PORT`.

```bash
PORT=8080 npm run dev
```

### Testes

```bash
npm test
```

## Pacotes

| Pacote | Conteúdo |
|---|---|
| `packages/genetic` | Motor genético genérico, seleção por torneio, gerador aleatório e execução por gerações. |
| `packages/jigsaw` | Peças com pinos e encaixes, operadores e caso de uso do quebra-cabeça de encaixe. |
| `packages/server` | API HTTP que transmite o progresso de cada jogo por SSE. |
| `packages/web` | Interface em HTML, CSS e JavaScript puros. |

## Parâmetros

Os parâmetros podem ser ajustados na tela antes de cada execução.

| Parâmetro | Padrão | Descrição |
|---|---|---|
| População | 300 | Quantidade de indivíduos em cada geração. |
| Elite | 15 | Melhores indivíduos copiados sem alteração para a próxima geração. Deve ser menor que a população. |
| Taxa de mutação | 0.3 | Probabilidade, entre 0 e 1, de um filho sofrer mutação. |
| Torneio | 3 | Quantidade de indivíduos sorteados em cada seleção. O de menor fitness vence. |
| Gerações máximas | 5000 | Limite de gerações antes de encerrar sem solução. |
| Limite de estagnação | 300 | Gerações sem melhora até a população ser recriada do zero. |
| Hotstart | 0% | Porcentagem da população inicial criada por uma heurística gulosa, que coloca peça por peça escolhendo as que encaixam com as vizinhas. Em zero, toda a população é aleatória. |

O quebra-cabeça é escolhido entre os tabuleiros prontos: 5x5, 7x7 e 10x10. O botão **Embaralhar** apenas muda a posição inicial das peças na tela. Até 7 peças por lado o algoritmo costuma resolver. Acima disso a dificuldade cresce rápido e a execução pode terminar com algumas bordas soltas, que aparecem em vermelho.

## Problema, abordagem, resultados e conclusões

### Problema

Dado um tabuleiro N×N de peças de quebra-cabeça, cada uma com quatro bordas tipadas (pino, encaixe ou reta), encontrar a permutação que encaixe todas as peças sem bordas soltas. O espaço de busca é N²!, o que torna força bruta inviável a partir de tabuleiros pequenos: 5×5 já tem 25! ≈ 10²⁵ permutações.

### Abordagem

Cada indivíduo é uma permutação de peças no tabuleiro e o fitness é a quantidade de bordas que não encaixam (zero = solução). A seleção por torneio escolhe pais, o `BlockCrossover` preserva blocos retangulares inteiros de um pai (mantendo vizinhos que já encaixam) e preenche o restante com peças do outro pai, e o `SwapMutation` troca duas peças da mesma classe de posição (canto, borda ou miolo), garantindo que a permutação continue válida. Elitismo copia os melhores para a próxima geração sem alteração. Quando o fitness estagna por muitas gerações, a população é descartada e recriada do zero, mas o melhor indivíduo global é preservado à parte. Um hotstart opcional usa uma heurística gulosa para gerar parte da população inicial já com bons encaixes.

### Resultados

Tabuleiros 5×5 são resolvidos de forma consistente em poucas centenas de gerações. O 7×7 (49 peças, 49! ≈ 10⁶²) costuma convergir, às vezes precisando de um ou mais reinícios por estagnação. O 10×10 (100 peças) raramente chega a fitness zero nos parâmetros padrão, terminando com algumas bordas soltas: o espaço de busca de 100! ≈ 10¹⁵⁷ supera a capacidade de exploração do algoritmo dentro do limite de gerações. O hotstart acelera a convergência nos tabuleiros menores, mas não é suficiente para resolver o 10×10 sozinho.

### Conclusões

O algoritmo genético resolve o quebra-cabeça de encaixe de forma eficiente até tamanhos moderados, demonstrando que operadores específicos ao problema (cruzamento por bloco, mutação por classe, classificação de posições) são mais importantes que parâmetros genéricos. O mecanismo de reinício por estagnação evita mínimos locais e permite múltiplas tentativas dentro de uma única execução. Para tabuleiros maiores, a abordagem genética sozinha encontra limitações, sugerindo que técnicas híbridas (como busca local pós-evolução ou decomposição do tabuleiro) seriam necessárias.

## Enunciado

O enunciado original do desafio está em [Sub-Tech_Challenge_2_anunciado.pdf](../Sub-Tech_Challenge_2_anunciado.pdf).
