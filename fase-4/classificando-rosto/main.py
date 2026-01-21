import cv2
import face_recognition
import os
import numpy as np

def load_images_from_folder(folder):
    known_face_encodings = []
    known_face_names = []

    # Percorrer todos os arquivos na pasta fornecida
    for filename in os.listdir(folder):
        # Verificar se o arquivo é uma imagem
        if filename.endswith(".jpg") or filename.endswith(".png"):
            # Carregar a imagem
            print(f"Carregando imagem: {filename}")
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

def main():
    image_folder = '../assets/images'  # Pasta contendo as imagens de rosto
    known_face_encodings, known_face_names = load_images_from_folder(image_folder)
    
    # Add validation: Check if any known faces were loaded
    if len(known_face_encodings) == 0:
        print("Erro: Nenhuma imagem de rosto encontrada na pasta 'images'.")
        print("Certifique-se de que existem imagens .jpg ou .png na pasta.")
        return
    
    video_capture = cv2.VideoCapture(0)

    while True:
        ret, frame = video_capture.read()
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            name = "Desconhecido"
            
            # Only process if we have known faces to compare against
            if len(known_face_encodings) > 0:
                matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                # Check if face_distances is not empty
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = known_face_names[best_match_index]
            
            face_names.append(name)
            face_names.append(name)  # Adicionar o nome à lista de nomes

        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Redimensionar as coordenadas das faces de volta ao tamanho original
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            # Desenhar um retângulo ao redor da face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            # Desenhar uma etiqueta com o nome abaixo da face
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

        # Exibir a imagem resultante
        cv2.imshow('Video', frame)

        # Pressionar 'q' para sair do loop
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Liberar a captura de vídeo e fechar todas as janelas
    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()