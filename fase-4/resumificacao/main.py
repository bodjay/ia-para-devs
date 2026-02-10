from transformers import pipeline

# Inicializar o pipeline de sumarização
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")


def read_docx(file_path):
    """
    Lê o texto de um documento .docx.
    :param docx_path: Caminho para o documento .docx
    :return: Texto completo do documento
    """

        # Use a with statement for automatic file handling
    with open(file_path, 'r') as file:
        # Read the entire file content as a single string
        content = file.read()

    # Split the content into a list of paragraphs using a double newline delimiter
    paragraphs_list = content.split('\n\n')

    # Optional: remove leading/trailing whitespace from each paragraph
    paragraphs_list = [p.strip() for p in paragraphs_list]

    return paragraphs_list


def summarize_text(text, max_length=130, min_length=30, do_sample=False):
    """
    Função para sumarizar um texto.
    :param text: Texto a ser sumarizado
    :param max_length: Comprimento máximo do resumo
    :param min_length: Comprimento mínimo do resumo
    :param do_sample: Se True, usar amostragem; se False, usar truncagem
    :return: Resumo do texto
    """
    summary = summarizer(text, max_length=max_length,
                         min_length=min_length, do_sample=do_sample)
    return summary[0]['summary_text']


def save_summary_to_txt(summary_text, txt_path):
    """
    Salva o resumo em um arquivo .txt.
    :param summary_text: Texto do resumo
    :param txt_path: Caminho para salvar o arquivo .txt
    """
    with open(txt_path, 'w', encoding='utf-8') as file:
        file.write(summary_text)


if __name__ == "__main__":
    # Caminho para o documento .docx
    docx_path = '../assets/transcricao.txt'  # Arquivo .docx
    txt_path = '../assets/resumo_transcricao.txt'  # Nome do arquivo de saída .txt

    # Ler o texto completo do documento
    full_text = read_docx(docx_path)

    # Sumarizar o texto completo
    summary = summarize_text(full_text, max_length=200, min_length=50)

    # Salvar o resumo em um arquivo .txt
    save_summary_to_txt(summary, txt_path)

    print("Sumarização completa. O resumo foi salvo em 'resumo.txt'.")
