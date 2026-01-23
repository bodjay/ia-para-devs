
import os
import face_recognition

def load_known_face_from_folder(folder):
    known_face_encodings = []
    known_face_names = []

    # Percorrer todos os arquivos na pasta fornecida
    for filename in os.listdir(folder):
        # Verificar se o arquivo é uma imagem
        if filename.endswith(".jpg") or filename.endswith(".png"):
            # Carregar a imagem
            image_path = os.path.join(folder, filename)
            image = face_recognition.load_image_file(image_path)
            # Obter as codificações faciais (assumindo uma face por imagem)
            face_encodings = face_recognition.face_encodings(image)

            if face_encodings:
                face_encoding = face_encodings[0]
                # Extrair o nome do arquivo, removendo o sufixo numérico e a extensão
                name = os.path.splitext(filename)[0][:-1]
                # Adicionar a codificação e o nome às listas
                known_face_encodings.append(face_encoding)
                known_face_names.append(name)

    return known_face_encodings, known_face_names


if __name__ == "__main__":
    load_known_face_from_folder('images')
