import moviepy as mp
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech
from dotenv import load_dotenv
import os

load_dotenv() 
    
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
CHUNK_SIZE = 16000  # bytes per chunk – adjust as needed

print(f"Projeto Google Cloud: {PROJECT_ID}")

def extract_audio_from_video(video_path, audio_path):
    """Extract audio track from video and save as WAV."""
    video = mp.VideoFileClip(video_path)
    video.audio.write_audiofile(audio_path)


def transcribe_audio_to_text(audio_path, text_output_path):
    """
    Transcribe audio file using streaming recognition.
    Audio is read and sent in chunks.
    """
    client = SpeechClient()

    # Recognition configuration
    config = cloud_speech.RecognitionConfig(
        auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
        language_codes=["pt-BR"],
        model="long",  # Use "long" for long-form audio; can also try "latest_long"
    )

    # Streaming config wraps the normal config
    streaming_config = cloud_speech.StreamingRecognitionConfig(config=config)

    def request_generator():
        """Yield StreamingRecognizeRequest messages."""
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

        # Collect final transcripts
        with open(text_output_path, "w", encoding="utf-8") as out_file:
            for response in responses:
                for result in response.results:
                    # Only take final results (not interim)
                    if result.is_final:
                        transcript = result.alternatives[0].transcript
                        out_file.write(transcript + "\n")
                        print(f"Transcrição parcial: {transcript}")

        print(f"Transcrição concluída. Salva em: {text_output_path}")

    except Exception as e:
        print(f"Erro durante a transcrição: {e}")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(script_dir, "../assets/video_audio.mp4")
    audio_path = os.path.join(script_dir, "../assets/audio.wav")
    text_output_path = os.path.join(script_dir, "../assets/transcricao.txt")

    extract_audio_from_video(video_path, audio_path)
    transcribe_audio_to_text(audio_path, text_output_path)


if __name__ == "__main__":
    main()