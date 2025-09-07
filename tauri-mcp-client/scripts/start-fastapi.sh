#!/bin/bash

# Navigate to the FastAPI server directory
cd /Users/akuldeepj/Desktop/code/cursor-talk-to-figma-mcp/tauri-mcp-client/resource/mcp-client-python/api

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install fastapi uvicorn python-dotenv pydantic-settings

# Install project dependencies if pyproject.toml exists
if [ -f "../pyproject.toml" ]; then
    cd ..
    pip install -e .
    cd api
fi

# Start the FastAPI server
echo "Starting FastAPI server on port 8000..."
python main.py
