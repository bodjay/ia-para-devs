# uml-dataset-generator

Gera datasets sintéticos de diagramas UML para fine-tuning de modelos de visão e linguagem, e fornece um notebook Jupyter para treinar o **Qwen2-VL-2B** com **Unsloth** e exportar o resultado para o **Ollama**.

## Visão geral

| Etapa | Script / Arquivo | Saída |
|-------|-----------------|-------|
| 1. Gerar diagramas | `generate_dataset.py` | `images/*.png` + `data/uml_dataset.csv` |
| 2. Construir dados de treino | `build_finetune_dataset.py` | `data/finetune_chat.jsonl` |
| 3. Fine-tuning do modelo | `fine_tuning.ipynb` (Google Colab) | Modelo GGUF para o Ollama |

O dataset contém **33 diagramas UML** em 7 tipos (class, sequence, flowchart, state, ER, Gantt, mindmap) com **5 variantes de instrução** cada (~165 exemplos de treino).

---

## Configuração local (Etapas 1 e 2)

**Windows:**
```bat
setup.bat
venv\Scripts\activate
```

**Mac / Linux:**
```bash
chmod +x setup.sh && ./setup.sh
source venv/bin/activate
```

**Gerar diagramas** (busca os PNGs via API do mermaid.ink):
```bash
python generate_dataset.py
```

**Construir o dataset de treino:**
```bash
python build_finetune_dataset.py
```

Os arquivos gerados são ignorados pelo git e ficam apenas localmente.

---

## Fine-tuning no Google Colab

### 1. Abrir o notebook

- Acesse [colab.research.google.com](https://colab.research.google.com)
- **Arquivo → Fazer upload de notebook** → selecione `fine_tuning.ipynb`

### 2. Ativar GPU

- **Runtime → Alterar tipo de runtime → Acelerador de hardware: GPU**
- T4 (plano gratuito) funciona para o modelo de 2B; A100 recomendado para treino mais rápido

### 3. Enviar o dataset

No **painel de arquivos** do Colab (barra lateral esquerda, ícone de pasta):
- Crie uma pasta `data/`
- Envie o arquivo `data/finetune_chat.jsonl` para dentro dela

### 4. Executar todas as células

**Runtime → Executar tudo** (ou execute as células uma a uma na ordem).

O notebook irá:
1. Instalar o Unsloth e as dependências
2. Carregar o `Qwen2-VL-2B-Instruct` (quantizado em 4 bits)
3. Configurar os adaptadores LoRA
4. Carregar o dataset JSONL e decodificar as imagens base64
5. Treinar por 60 passos (~10–20 min na T4)
6. Salvar os adaptadores LoRA em `uml_analyzer_lora/`
7. Exportar o GGUF (`q4_k_m`) em `uml_analyzer_gguf/`
8. Gerar o `Modelfile` para o Ollama

### 5. Baixar o modelo

Após o treino, no painel de arquivos do Colab:
- Clique com o botão direito em `uml_analyzer_gguf/` → **Baixar**
- Baixe também o arquivo `Modelfile`

---

## Usando o modelo com o Ollama

Coloque `uml_analyzer_gguf/` e `Modelfile` no mesmo diretório e execute:

```bash
# Criar o modelo no Ollama
ollama create uml-analyzer -f Modelfile

# Executar
ollama run uml-analyzer
```

Exemplo de prompt (multimodal — requer Ollama 0.1.30+):
```
>>> Analise este diagrama UML e descreva sua estrutura. [anexar imagem]
```

---

## Formato do dataset

O `finetune_chat.jsonl` usa o formato de chat da OpenAI com imagens codificadas em base64:

```json
{
  "id": "class_001_describe",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}},
        {"type": "text", "text": "Analise este diagrama UML..."}
      ]
    },
    {"role": "assistant", "content": "Diagrama de classes mostrando um sistema de adoção de animais..."}
  ],
  "metadata": {"diagram_id": "class_001", "diagram_type": "class", "variant": "describe"}
}
```

**Variantes de instrução por diagrama:**

| Variante | Instrução |
|----------|-----------|
| `describe` | Descrição estrutural completa |
| `entities` | Listar todas as entidades/componentes |
| `relationships` | Descrever todos os relacionamentos |
| `diagram_type` | Identificar o tipo de diagrama e seu propósito |
| `mermaid` | Gerar o código Mermaid equivalente |
