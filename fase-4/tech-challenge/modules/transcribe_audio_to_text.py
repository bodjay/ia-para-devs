from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech
import os

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
CHUNK_SIZE = 16000

print(f"[system] Projeto Google Cloud: {PROJECT_ID}")
print(f"[system] Tamanho do chunk: {CHUNK_SIZE} bytes")


""""
Este módulo é responsável por transcrever um arquivo de áudio para texto usando o serviço de reconhecimento de fala do Google Cloud.
A função `transcribe` recebe o caminho do arquivo de áudio de entrada e o caminho onde o arquivo de texto transcrito deve ser salvo.
O áudio é processado em chunks para permitir a transcrição de arquivos longos.
"""
def transcribe(audio_path, text_output_path):
    """
    Transcreve arquivo de áudio usando reconhecimento de streaming.
    O áudio é lido e enviado em chunks.
    """
    client = SpeechClient()

    config = cloud_speech.RecognitionConfig(
        auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
        language_codes=["pt-BR"],
        model="long",
    )

    streaming_config = cloud_speech.StreamingRecognitionConfig(config=config)

    def request_generator():
        """Mensagens de solicitação para streaming. """
        # First request: configuration
        yield cloud_speech.StreamingRecognizeRequest(
            recognizer=f"projects/{PROJECT_ID}/locations/global/recognizers/_",
            streaming_config=streaming_config,
        )

        # Subsequent requests: audio chunks
        with open(audio_path, "rb") as audio_file:
            while chunk := audio_file.read(CHUNK_SIZE):
                yield cloud_speech.StreamingRecognizeRequest(audio=chunk)

    try:
        print("Processando streaming...")
        responses = client.streaming_recognize(requests=request_generator())

        with open(text_output_path, "w", encoding="utf-8") as out_file:
            for response in responses:
                for result in response.results:

                    if result.is_final:
                        transcript = result.alternatives[0].transcript
                        out_file.write(transcript + "\n")
                        print(f"Transcrição parcial: {transcript}")

        print(f"Transcrição concluída. Salva em: {text_output_path}")

    except Exception as e:
        print(f"Erro durante a transcrição: {e}")
