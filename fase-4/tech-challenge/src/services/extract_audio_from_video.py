import moviepy as mp

""""
Este módulo é responsável por extrair a faixa de áudio de um vídeo e salvá-la como um arquivo WAV.
A função `extract` recebe o caminho do vídeo de entrada e o caminho onde o arquivo de áudio deve ser salvo.
"""
def extract(video_path, audio_path):
    """Extrai a faixa de áudio do vídeo e salva como WAV."""
    video = mp.VideoFileClip(video_path)
    video.audio.write_audiofile(audio_path)