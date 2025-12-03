import nltk
from nltk import tokenize
from string import punctuation
import pandas as pd
import unidecode

ratings = pd.read_csv('datasets/avaliacoes.csv')
relevants_df = ratings[['review_text', 'polarity']]

white_space_tokenizer = tokenize.WhitespaceTokenizer()
word_punct = tokenize.WordPunctTokenizer()

todas_palavras = ' '.join(relevants_df['review_text'].tolist())
token_dataset = white_space_tokenizer.tokenize(todas_palavras)
# frequencia = nltk.FreqDist(token_dataset)

pontuacao = list()
for ponto in punctuation:
  pontuacao.append(ponto)

palavras_irrelevantes = nltk.corpus.stopwords.words("portuguese")
palavras_irrelevantes_sem_acento = [unidecode.unidecode(palavra) for palavra in palavras_irrelevantes]

pontuacao_stopwords = pontuacao + palavras_irrelevantes + palavras_irrelevantes_sem_acento
frase_processada = list()

for avaliacao in relevants_df['review_text']:
  palavras_texto = white_space_tokenizer.tokenize(avaliacao)
  palavras_text_sem_pontuacao = word_punct.tokenize(' '.join(palavras_texto))
  palavras_text_sem_pontuacao_sem_acento = [unidecode.unidecode(palavra.lower()) for palavra in palavras_text_sem_pontuacao]

  nova_frase = list()
  for palavra in palavras_text_sem_pontuacao_sem_acento:
    if palavra not in pontuacao_stopwords:
      nova_frase.append(palavra)
  frase_processada.append(' '.join(nova_frase))

relevants_df["tokenized"] = frase_processada

print(relevants_df.head(10))
