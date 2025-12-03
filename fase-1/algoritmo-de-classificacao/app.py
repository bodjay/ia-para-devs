import pickle

with open('./dist/model.pkl', 'rb') as file:
    model = pickle.load(file)

# Carregar o vetorizador usado no treinamento
with open('./dist/vectorizer.pkl', 'rb') as file:
    vectorizer = pickle.load(file)


# Transformar o texto de entrada em uma matriz esparsa
input_text = ["Que produto bom! Eu adorei, super recomendo."]
input_vectorized = vectorizer.transform(input_text)

# Fazer a previsão
print("Predição para o texto de entrada:")
print(input_text)
result = model.predict(input_vectorized)
print(result.tolist())