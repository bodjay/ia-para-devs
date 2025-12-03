import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import CountVectorizer

ratings = pd.read_csv('datasets/avaliacoes.csv')

relevants_df = ratings[['review_text', 'polarity']]

relevants_df.dropna(inplace=True, axis=0)

print(relevants_df.info())
print('#######')
print(relevants_df['polarity'].value_counts())

X = relevants_df['review_text']
y = relevants_df['polarity']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

print(f'Tamanho do conjunto de treino: {len(X_train)}')
print(f'Tamanho do conjunto de teste: {len(X_test)}')
print(f'Distribuição de polaridade no conjunto de treino:\n{y_train.value_counts()}')
print(f'Distribuição de polaridade no conjunto de teste:\n{y_test.value_counts()}')
print('#######')

try:
    model = LogisticRegression()
    model.fit(X_train, y_train)
    model.score(X_test, y_test)    
except ValueError as e:
    print(f'Erro durante o treinamento do modelo: {e}')
    print("Isso pode ser resolvido usando técnicas de PLN, como tokenização, remoção de stop words e vetorização.")

print("Por exemplo, você pode usar CountVectorizer ou TfidfVectorizer do sklearn para converter dados de texto em formato numérico.")
print('Esta estratégia se chama Bag of Words (BoW).')



vectorizer = CountVectorizer()
def treinar_modelo(dados, colunas_texto, colunas_alvo):
    bag_of_words = vectorizer.fit_transform(dados[colunas_texto])

    X_train, X_test, y_train, y_test = train_test_split(bag_of_words, dados[colunas_alvo], stratify=dados[colunas_alvo], random_state=42)

    modelo = LogisticRegression()
    modelo.fit(X_train, y_train)
    accuracy = modelo.score(X_test, y_test)
    print(f'Acurácia do modelo: {accuracy:.2f}')
    return modelo, accuracy

model, accuracy = treinar_modelo(relevants_df, 'review_text', 'polarity')

print(f'Acurácia: {accuracy:.2f}')
print('Re-treinamento do modelo concluído com sucesso.')
print('#######')

print('Extraindo o modelo usando pickle')
with open('./dist/model.pkl', 'wb') as model_file:
    pickle.dump(model, model_file)

# Salvar o vetorizador
with open('./dist/vectorizer.pkl', 'wb') as vectorizer_file:
    pickle.dump(vectorizer, vectorizer_file)