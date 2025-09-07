#!/bin/bash

echo "🧹 Cleaning up and rebuilding FastAPI environment with Python 3.11..."

# Navigate to API directory
cd /Users/akuldeepj/Desktop/code/cursor-talk-to-figma-mcp/tauri-mcp-client/resource/mcp-client-python/api

# Check if Python 3.11 is available
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
    echo "✅ Using Python 3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | grep -o '3\.[0-9][0-9]*')
    if [[ "$PYTHON_VERSION" == "3.11" ]]; then
        PYTHON_CMD="python3"
        echo "✅ Using Python 3.11 (via python3)"
    else
        echo "⚠️  Warning: python3 is version $PYTHON_VERSION, not 3.11"
        echo "   Installing with available Python version..."
        PYTHON_CMD="python3"
    fi
else
    echo "❌ Error: No Python 3 installation found"
    exit 1
fi

# Remove old virtual environment
if [ -d "venv" ]; then
    echo "Removing old virtual environment..."
    rm -rf venv
fi

# Create new virtual environment with Python 3.11
echo "Creating new virtual environment with $PYTHON_CMD..."
$PYTHON_CMD -m venv venv

# Activate virtual environment
source venv/bin/activate

# Verify Python version in venv
echo "Python version in virtual environment:"
python --version

# Upgrade pip first
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies with Python 3.11 compatible versions
echo "Installing Python 3.11 compatible dependencies..."
pip install fastapi==0.104.1
pip install "uvicorn[standard]==0.24.0"
pip install python-dotenv==1.0.0
pip install pydantic-settings==2.0.3
pip install "pydantic==2.4.2"

# Test imports
echo "Testing FastAPI imports..."
python -c "
import sys
import fastapi
import uvicorn
import pydantic
print(f'✅ Python version: {sys.version}')
print(f'✅ FastAPI version: {fastapi.__version__}')
print(f'✅ Pydantic version: {pydantic.__version__}')
print('✅ All imports successful!')
"

echo "🎉 FastAPI environment rebuilt successfully with Python 3.11!"
echo "Now run: npm run tauri:dev:auto"
