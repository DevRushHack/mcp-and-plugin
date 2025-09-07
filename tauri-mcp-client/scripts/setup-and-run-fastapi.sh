#!/bin/bash

# Script to set up and run the FastAPI server
echo "Setting up FastAPI server..."

# Navigate to the API directory
cd "$(dirname "$0")/../resource/mcp-client-python/api"

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "Creating and activating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
else
    echo "Virtual environment already active: $VIRTUAL_ENV"
fi

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install the parent package in development mode
cd ..
if [ -f "pyproject.toml" ]; then
    echo "Installing mcp-client-python package..."
    pip install -e .
fi

# Return to API directory and start the server
cd api
echo "Starting FastAPI server on http://localhost:8000"
python main.py
