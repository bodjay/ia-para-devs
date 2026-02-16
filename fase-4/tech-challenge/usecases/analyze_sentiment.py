import boto3
import textwrap
import json

CHUNK_SIZE = 4000


def act(resources):
    logPrefix = "analyze_sentiment"

    print(f"[{logPrefix}] Iniciando análise de sentimento...")
    comprehend = boto3.client('comprehend')

    for resource in resources:
        path_to_output = resource["text_output_path"]

        with open(path_to_output, 'r') as file:
            text = file.read()

        chunks = split_text_into_chunks(text, CHUNK_SIZE)

        results = []

        for i, chunk in enumerate(chunks):
            sentiment = comprehend.detect_sentiment(
                Text=chunk, LanguageCode='pt')

            results.append({
                "transcription": chunk,
                "sentiment": sentiment
            })

        final_output_file = path_to_output.replace(".txt", ".final_output.json")

        with open(final_output_file, 'w') as final_output:
            json.dump(results, final_output, ensure_ascii=False, indent=4)

    print(f"[{logPrefix}] Análise de sentimento concluída. Resultados salvos no arquivo JSON consolidado.")


def split_text_into_chunks(text, chunk_size):
    return textwrap.wrap(text, chunk_size)
