from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score

texts = [
    "O novo lançamento da Apple",
    "Resultado do jogo de ontem",
    "Eleições presidenciais",
    "Atualização no mundo da tecnologia",
    "Campeonato de futebol",
    "Política internacional",
    "Lançamento de bombas intensificam guerra, um verdadeiro campeonato de poder",
    "Disputas por território fazem países se questionarem",
    "Acompanhe no brasileirão, a classificação dos novos jogos"
]
categories = ["tecnologia", "esportes", "política", "tecnologia", "esportes", "política", "política", "política", "esportes"]

vectorizer = CountVectorizer()
X = vectorizer.fit_transform(texts)

X_train, X_test, y_train, y_test = train_test_split(X, categories, test_size=0.5, random_state=42)

model = MultinomialNB()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100}")

########## Custom usage
new_entry = vectorizer.transform(["O setor de tecnologia se alia com países em guerra e causa uma verdadeira competição de caos"])

y_new_entry = model.predict(new_entry)
print(f"New entry category: {y_new_entry}")

