import os
import modules.transcribe_video as transcribe_video

if __name__ == "__main__":
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

    for resource in resources:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        video_path = os.path.join(
            script_dir, resource["video_path"])  # Video de entrada
        audio_path = os.path.join(script_dir, resource["audio_path"])

        text_output_path = os.path.join(
            script_dir, resource["text_output_path"])

        if not os.path.exists(audio_path):
            transcribe_video.extract_audio_from_video(video_path, audio_path)

        if not os.path.exists(text_output_path):
            transcribe_video.transcribe_audio_to_text(audio_path, text_output_path)
