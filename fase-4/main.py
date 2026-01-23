from services import detect_face_in_webcam
from services import analyze_emotions_video
from utils import load_known_face_from_folder
import os

def main():
    # print("Iniciando detecção de rosto na webcam...")
    detect_face_in_webcam()

    # print("Analisando emoções no vídeo...")
    # # Carregar imagens e codificações
    # known_face_encodings, known_face_names = load_known_face_from_folder('./assets/images')

    # # Caminho para o arquivo de vídeo na mesma pasta do script
    # script_dir = os.path.dirname(os.path.abspath(__file__))
    # input_video_path = os.path.join(script_dir, './assets/video.mp4')
    # output_video_path = os.path.join(script_dir, 'output_video_recognize.mp4')  # Nome do vídeo de saída

    # # Chamar a função para detectar emoções e reconhecer faces no vídeo, salvando o vídeo processado
    # analyze_emotions_video(input_video_path, output_video_path, known_face_encodings, known_face_names)


if __name__ == "__main__":
    main()
