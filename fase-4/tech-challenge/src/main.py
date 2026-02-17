import asyncio
import sys
from dotenv import load_dotenv
import usecases.prepare_analysis_resources
import usecases.analyze_sentiment
from agents.atendant_workflow import invoke
from services.logger import logger

load_dotenv()

"""
Ponto de entrada principal do programa.

Define os recursos de vídeo, áudio e transcrição, e inicia o processo de preparação dos recursos para análise.
Também expõe o workflow de agentes para processamento inteligente de consultas.

Modo de uso:
    python main.py              # Executa workflow de exemplo com queries predefinidas
    python main.py --terminal   # Inicia interface interativa de terminal
"""


async def run_agents_workflow():
    """
    Executa exemplos do workflow de agentes.

    Exemplos de consultas que podem ser processadas:
    1. "How to prevent Deep Vein Thrombosis?" - Agente de Saúde
    2. "My name is Joe, book me an appointment for tomorrow." - Agente de Consultas
    3. "Why AI Still Isn't Fixing Patient Referrals—And How It Could" - Agente de Mídia
    """
    logger.info("=== Iniciando Workflow de Agentes ===\n")

    queries = [
        "What are the symptoms of flu?",  # Será roteado para health_assistant
        "Book me an appointment for tomorrow",  # Será roteado para appointments_assistant
    ]

    for query in queries:
        logger.info(f"📋 Query: {query}\n")
        try:
            result = await invoke(query)
            logger.info(f"✅ Resposta Final:\n{result.get('final_answer', 'N/A')}\n")
            logger.info("-" * 80 + "\n")
        except Exception as e:
            logger.error(f"❌ Erro ao processar query: {str(e)}\n")


def main():
    """Função principal que orquestra todo o pipeline."""
    logger.info("=== Sistema de Atendimento Médico ===\n")

    # Configurar recursos (mantém funcionalidade anterior)
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

    # Executa análise de recursos
    logger.info("=== Análise de Recursos ===\n")
    usecases.prepare_analysis_resources.act(resources)
    usecases.analyze_sentiment.act(resources)

    # Executa workflow de agentes
    logger.info("\n")
    asyncio.run(run_agents_workflow())

    logger.info("=== Sistema Finalizado ===")


if __name__ == "__main__":
    # Suporte a modo terminal interativo
    if len(sys.argv) > 1 and sys.argv[1] == "--terminal":
        logger.info("=== Iniciando Interface de Terminal ===\n")
        from pathlib import Path
        # Adicionar o diretório src ao path
        sys.path.insert(0, str(Path(__file__).parent))
        
        async def run_chat():
            """Executa a interface de chat interativa."""
            print("\n" + "=" * 80)
            print("🏥 Chat iniciado com o Assistente de Atendimento Médico")
            print("Digite '/sair' para encerrar a sessão")
            print("=" * 80 + "\n")
            
            while True:
                try:
                    question = input("👤 Você: ").strip()
                    
                    if question.lower() == "/sair":
                        print("\n👋 Até logo! Sessão encerrada.\n")
                        break
                    
                    if not question:
                        print("⚠️  Por favor, digite uma pergunta válida.\n")
                        continue
                    
                    print("-" * 80)
                    
                    try:
                        logger.info(f'[Terminal] Processando consulta: {question}')
                        response = await invoke(question)
                        final_answer = response.get("final_answer", "N/A")
                        print(f"🤖 Assistente: {final_answer}")
                        
                    except Exception as e:
                        logger.error(f'[error: Terminal] Erro ao processar consulta: {str(e)}')
                        print(f"❌ Desculpe, ocorreu um erro ao processar sua consulta.")
                        print(f"   Detalhes: {str(e)}\n")
                    
                    print("-" * 80 + "\n")
                    
                except KeyboardInterrupt:
                    print("\n\n👋 Sessão interrompida pelo usuário.\n")
                    break
                except EOFError:
                    print("\n👋 Entrada finalizada.\n")
                    break
        
        asyncio.run(run_chat())
    else:
        main()
