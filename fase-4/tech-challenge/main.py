from dotenv import load_dotenv
import usecases.prepare_analysis_resources
import usecases.analyze_sentiment

load_dotenv()

""""
Ponto de entrada principal do programa.
Define os recursos de vídeo, áudio e transcrição, e inicia o processo de preparação dos recursos para análise.
"""


def main():
    resources = [
        {
            "video_path": "./assets/simulacao-1-video.mp4",
            "audio_path": "./assets/simulacao-1-audio.wav",
            "text_output_path": "./assets/simulacao-1-transcricao.txt"
        },
        {
            "video_path": "./assets/simulacao-2-video.mp4",
            "audio_path": "./assets/simulacao-2-audio.wav",
            "text_output_path": "./assets/simulacao-2-transcricao.txt"
        },
    ]

    # Inicia o processo de extração de audio e transcrição para cada recurso/
    usecases.prepare_analysis_resources.act(resources)
    usecases.analyze_sentiment.act(resources)


if __name__ == "__main__":
    main()
