
import os

import modules.extract_audio_from_video
import modules.transcribe_audio_to_text

""""
Este módulo é responsável por preparar os recursos necessários para a análise, incluindo:
- Extração de áudio dos vídeos, se o arquivo de áudio correspondente não existir.
- Transcrição do áudio para texto, se o arquivo de transcrição correspondente não existir.
"""
def act(paths):
    logPrefix = os.path.basename(__file__)

    print(f"[{logPrefix}] Iniciando preparação dos recursos de análise...")
    try:
        for path in paths:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            video_path = os.path.join(
                script_dir, path["video_path"])  # Video de entrada
            audio_path = os.path.join(script_dir, path["audio_path"])

            text_output_path = os.path.join(
                script_dir, path["text_output_path"])

            if not os.path.exists(audio_path) and os.path.exists(video_path):
                modules.extract_audio_from_video.extract(video_path, audio_path)

            if not os.path.exists(text_output_path) and os.path.exists(audio_path):
                modules.transcribe_audio_to_text.transcribe(audio_path, text_output_path)        

    except Exception as e:
        print(f"[{logPrefix}] Erro durante o processamento: {e}")

    print(f"[{logPrefix}] Processamento concluído para todos os recursos.")


if __name__ == "__main__":
    act()
