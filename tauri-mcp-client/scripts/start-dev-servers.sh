#!/bin/bash

# Script to start both Next.js and FastAPI servers for Tauri development
echo "Starting development servers for Tauri..."

# Function to cleanup background processes on exit
cleanup() {
    echo "Cleaning up background processes..."
    if [ ! -z "$FASTAPI_PID" ]; then
        kill $FASTAPI_PID 2>/dev/null
    fi
    if [ ! -z "$NEXTJS_PID" ]; then
        kill $NEXTJS_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start FastAPI server in background
echo "Starting FastAPI server..."
(
    cd resource/mcp-client-python/api
    
    # Check if virtual environment exists, if not create it
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if needed
    if [ ! -f "venv/.dependencies_installed" ]; then
        echo "Installing Python dependencies..."
        pip install --upgrade pip
        pip install -r requirements.txt
        
        # Install the parent package
        cd ..
        if [ -f "pyproject.toml" ]; then
            pip install -e .
        fi
        cd api
        
        # Mark dependencies as installed
        touch venv/.dependencies_installed
    else
        echo "Python dependencies already installed."
    fi
    
    # Start FastAPI server
    echo "FastAPI server starting on http://localhost:8000"
    python main.py
) &
FASTAPI_PID=$!

# Wait a moment for FastAPI to start
sleep 3

# Start Next.js development server
echo "Starting Next.js development server..."
npm run dev &
NEXTJS_PID=$!

# Wait for Next.js to be ready
echo "Waiting for servers to be ready..."
while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
done

while ! curl -s http://localhost:8000/health > /dev/null; do
    sleep 1
done

echo "✅ Both servers are ready!"
echo "🌐 Next.js: http://localhost:3000"
echo "🚀 FastAPI: http://localhost:8000"
echo "📖 FastAPI Docs: http://localhost:8000/docs"

# Wait for both processes
wait $FASTAPI_PID $NEXTJS_PID
