#!/usr/bin/env bash
# Para todos os serviços iniciados por start.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Tech Challenge — Saúde da Mulher  (Fase 4)        ║"
echo "║   Encerrando serviços...                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

declare -A SERVICE_NAMES=(
  [".yolo.pid"]="YOLOv8 API  (Python)"
  [".agents.pid"]="Agents API (TypeScript)"
)

for pidfile_name in ".yolo.pid" ".agents.pid"; do
  pidfile="$SCRIPT_DIR/$pidfile_name"
  label="${SERVICE_NAMES[$pidfile_name]}"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill "$pid" 2>/dev/null; then
      log_info "$label encerrado (PID: $pid)"
    else
      log_warn "$label já estava encerrado (PID: $pid)"
    fi
    rm -f "$pidfile"
  else
    log_warn "$label — PID file não encontrado (serviço não estava rodando)"
  fi
done

# Libera as portas forçadamente (caso o processo não tenha respondido ao kill)
for port in 3000 8000; do
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    log_warn "Porta $port ainda em uso (PID: $pid). Forçando encerramento..."
    kill -9 "$pid" 2>/dev/null || true
  fi
done

echo ""
log_info "Concluído. Execute ./start.sh para reiniciar."
echo ""
