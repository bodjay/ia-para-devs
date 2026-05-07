#!/bin/bash
# Setup do ambiente virtual para geração do dataset UML

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Ambiente pronto. Para ativar: source .venv/bin/activate"
