@echo off
REM Setup do ambiente virtual para geração do dataset UML

python -m venv .venv
call .venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ✅ Ambiente pronto. Para ativar: .venv\Scripts\activate
