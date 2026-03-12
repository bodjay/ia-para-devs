#!/usr/bin/env bash
# ============================================================
#  Tech Challenge — Saúde da Mulher (Fase 4)
#  Inicia todos os serviços em um único comando:
#
#    • modules/yolo   → Python YOLOv8 API         (porta 8000)
#    • modules/agents → TypeScript Agents API      (porta 3000)
#    • Frontend       → servido em /examples       (porta 3000)
#
#  Uso:
#    ./start.sh               # inicia tudo
#    ./start.sh --no-yolo     # pula o serviço Python YOLO
#
#  Para encerrar: ./stop.sh  (ou Ctrl+C)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
log_ok()    { echo -e "${GREEN}${BOLD}  ✓${NC}  $1"; }

# ── Flags ──────────────────────────────────────────────────────────────────
NO_YOLO=false
for arg in "$@"; do
  case "$arg" in --no-yolo) NO_YOLO=true ;; esac
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Tech Challenge — Saúde da Mulher  (Fase 4)        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Helpers ─────────────────────────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    log_error "'$1' não encontrado. $2"; exit 1
  fi
}

# Mata processo usando uma porta (se houver)
free_port() {
  local port=$1
  local pid
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    log_warn "Porta $port em uso (PID: $pid). Encerrando processo anterior..."
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
}

# Aguarda um endpoint HTTP responder com retry
wait_for_http() {
  local url="$1"
  local label="$2"
  local retries=${3:-20}
  local i=0
  while [ $i -lt $retries ]; do
    if curl -sf "$url" &>/dev/null; then
      log_ok "$label  →  $url"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  log_warn "$label ainda não respondeu em $url — verifique os logs."
  return 1
}

# ── Pré-requisitos ──────────────────────────────────────────────────────────
log_step "Verificando dependências..."

check_cmd node   "Instale o Node.js 20+: https://nodejs.org"
check_cmd python3 "Instale o Python 3.10+: https://python.org"
check_cmd npx    "npx não encontrado — reinstale o Node.js"

log_info "Node.js  : $(node --version)"
log_info "Python   : $(python3 --version)"

# ffmpeg — necessário para extração de frames no TypeScript
if command -v ffmpeg &>/dev/null; then
  log_info "ffmpeg   : $(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3)"
else
  log_warn "ffmpeg não encontrado no PATH."
  log_warn "A extração de frames para análise de vídeo pode falhar."
  log_warn "Instale: brew install ffmpeg  (macOS) | apt install ffmpeg (Linux)"
fi

# Ollama — necessário para os agentes LLM (TypeScript)
OLLAMA_OK=false
if command -v ollama &>/dev/null; then
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    OLLAMA_OK=true
    log_info "Ollama   : rodando em http://localhost:11434"
    # Verifica modelos essenciais
    for model in llava llama3.2:1b; do
      if ollama list 2>/dev/null | grep -q "$model"; then
        log_info "  ✓ modelo '$model' disponível"
      else
        log_warn "  modelo '$model' não encontrado — execute: ollama pull $model"
      fi
    done
  else
    log_warn "Ollama instalado mas não está em execução."
    log_warn "Execute em outro terminal: ollama serve"
    log_warn "Os agentes LLM ficarão indisponíveis até o Ollama iniciar."
  fi
else
  log_warn "Ollama não encontrado. Instale: https://ollama.com"
  log_warn "Os agentes LLM ficarão indisponíveis."
fi

# ── Diretórios de trabalho ──────────────────────────────────────────────────
log_step "Preparando diretórios de upload..."

for dir in \
  "$SCRIPT_DIR/modules/agents/uploads" \
  "$SCRIPT_DIR/modules/agents/uploads/temp" \
  "$SCRIPT_DIR/modules/agents/uploads/temp/frames"; do
  mkdir -p "$dir"
done

log_info "Diretórios de upload OK."

# ── Módulo YOLOv8 (Python FastAPI) ─────────────────────────────────────────
YOLO_DIR="$SCRIPT_DIR/modules/yolo"
YOLO_PORT=8000
YOLO_PID_FILE="$SCRIPT_DIR/.yolo.pid"
YOLO_LOG="$SCRIPT_DIR/.yolo.log"

if [ "$NO_YOLO" = false ]; then
  log_step "Configurando módulo YOLOv8 (Python)..."
  free_port "$YOLO_PORT"

  if [ ! -d "$YOLO_DIR" ]; then
    log_error "Diretório modules/yolo não encontrado."; exit 1
  fi

  cd "$YOLO_DIR"

  # Cria venv isolado dentro de modules/yolo/ se não existir
  if [ ! -d ".venv" ]; then
    log_info "Criando ambiente virtual Python em modules/yolo/.venv ..."
    python3 -m venv .venv
  fi

  source .venv/bin/activate

  log_info "Instalando/verificando dependências Python..."
  pip install -q --upgrade pip
  pip install -q -r requirements.txt

  # Pré-baixa pesos YOLOv8 se ainda não estiverem no cache
  log_info "Verificando pesos YOLOv8..."
  python3 -c "
from ultralytics import YOLO
import os
for w in ['yolov8n.pt', 'yolov8n-pose.pt']:
    path = os.path.join('$(pwd)', w)
    if not os.path.exists(path):
        print(f'Baixando {w}...')
        YOLO(w)
    else:
        print(f'{w} já disponível.')
" 2>&1 | sed 's/^/    /'

  log_info "Iniciando API YOLOv8 na porta $YOLO_PORT..."
  uvicorn main:app \
    --host 0.0.0.0 \
    --port "$YOLO_PORT" \
    --log-level warning \
    > "$YOLO_LOG" 2>&1 &
  YOLO_PID=$!
  echo "$YOLO_PID" > "$YOLO_PID_FILE"
  log_info "API YOLOv8 iniciada (PID: $YOLO_PID) — log: $YOLO_LOG"

  deactivate
  cd "$SCRIPT_DIR"
else
  log_warn "--no-yolo: serviço Python YOLO ignorado. Detecção em tempo real indisponível."
fi

# ── Módulo Agents (TypeScript) ──────────────────────────────────────────────
AGENTS_DIR="$SCRIPT_DIR/modules/agents"
AGENTS_PORT=3000
AGENTS_PID_FILE="$SCRIPT_DIR/.agents.pid"
AGENTS_LOG="$SCRIPT_DIR/.agents.log"

log_step "Configurando módulo Agents (TypeScript)..."
free_port "$AGENTS_PORT"

if [ ! -d "$AGENTS_DIR" ]; then
  log_error "Diretório modules/agents não encontrado."; exit 1
fi

cd "$AGENTS_DIR"

if [ ! -d "node_modules" ]; then
  log_info "Instalando dependências Node.js..."
  npm install --legacy-peer-deps
else
  log_info "node_modules encontrado — pulando npm install."
fi

log_info "Iniciando API de Agentes na porta $AGENTS_PORT..."
YOLO_API_URL="http://localhost:$YOLO_PORT" \
PORT="$AGENTS_PORT" \
  npx tsx ./src/infra/api.ts \
  > "$AGENTS_LOG" 2>&1 &
AGENTS_PID=$!
echo "$AGENTS_PID" > "$AGENTS_PID_FILE"
log_info "API de Agentes iniciada (PID: $AGENTS_PID) — log: $AGENTS_LOG"

cd "$SCRIPT_DIR"

# ── Health checks ───────────────────────────────────────────────────────────
log_step "Aguardando serviços iniciarem..."

if [ "$NO_YOLO" = false ]; then
  wait_for_http "http://localhost:$YOLO_PORT/health" "YOLOv8 API  " 30
fi

wait_for_http "http://localhost:$AGENTS_PORT/examples/index.html" "Agents API  " 30

# ── Banner final ─────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              Serviços disponíveis                        ║"
echo "╠══════════════════════════════════════════════════════════╣"
printf "║  %-24s  %-31s  ║\n" "Frontend"    "http://localhost:3000/examples"
printf "║  %-24s  %-31s  ║\n" "Agents API"  "http://localhost:3000"
printf "║  %-24s  %-31s  ║\n" "YOLO API"    "http://localhost:8000"
printf "║  %-24s  %-31s  ║\n" "YOLO Docs"   "http://localhost:8000/docs"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Logs:                                                   ║"
printf "║    %-52s  ║\n" "tail -f .agents.log"
printf "║    %-52s  ║\n" "tail -f .yolo.log"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Detecção em tempo real (OpenCV local):                  ║"
printf "║    %-52s  ║\n" "cd modules/yolo && source .venv/bin/activate"
printf "║    %-52s  ║\n" "python realtime.py            # webcam"
printf "║    %-52s  ║\n" "python realtime.py --source video.mp4"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Para encerrar: ./stop.sh  ou  Ctrl+C                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Cleanup ao encerrar (Ctrl+C / SIGTERM) ───────────────────────────────────
_cleanup() {
  echo ""
  log_info "Encerrando serviços..."
  for pidfile in "$YOLO_PID_FILE" "$AGENTS_PID_FILE"; do
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile")
      kill "$pid" 2>/dev/null && log_info "PID $pid encerrado." || true
      rm -f "$pidfile"
    fi
  done
  log_info "Todos os serviços foram encerrados."
}
trap _cleanup EXIT INT TERM

wait
