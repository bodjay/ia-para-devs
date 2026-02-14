import boto3
import textwrap

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

        for i, chunk in enumerate(chunks):
            sentiment = comprehend.detect_sentiment(
                Text=chunk, LanguageCode='pt')

            chunk_output_file = path_to_output.replace(
                ".txt", f"_chunk_{i+1}.sentiment.txt")

            with open(chunk_output_file, 'w') as output_file:
                output_file.write(str(sentiment))

            final_output_file = path_to_output.replace(".txt", ".final_output.txt")

            with open(final_output_file, 'w') as final_output:
                final_output.write("Transcrição Original:\n")
                final_output.write(text + "\n\n")

                for j, chunk in enumerate(chunks):
                    sentiment = comprehend.detect_sentiment(
                        Text=chunk, LanguageCode='pt')

                    chunk_output_file = path_to_output.replace(
                        ".txt", f"_chunk_{j+1}.sentiment.txt")

                    with open(chunk_output_file, 'w') as output_file:
                        output_file.write(str(sentiment))

                    final_output.write(f"Chunk {j+1}: {str(sentiment)}\n")

        print(f"[{logPrefix}] Análise de sentimento concluída. Resultados salvos em arquivos separados, consolidado e no arquivo final com transcrição.")


def split_text_into_chunks(text, chunk_size):
    return textwrap.wrap(text, chunk_size)
