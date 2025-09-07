# FastAPI Integration Guide

This guide explains how to use the integrated FastAPI server with your Figma MCP Client application.

## Overview

The FastAPI server provides a REST API interface to interact with the Figma MCP server. It's automatically managed when running in Tauri mode, or can be run manually in web development mode.

## 🚀 Quick Start

### For Tauri Development (Recommended)

The FastAPI server is automatically managed by the Tauri application:

```bash
# Run the Tauri app with automatic FastAPI management
npm run tauri:dev:auto
```

When running in Tauri mode:
- ✅ FastAPI server starts automatically
- ✅ Python virtual environment is created automatically
- ✅ Dependencies are installed automatically
- ✅ Server status is managed through the UI
- ✅ Start/Stop controls available in the app

### For Web Development

Run both servers manually:

```bash
# Run both Next.js and FastAPI together
npm run dev:all

# Or run them separately:
npm run dev              # Next.js only
npm run fastapi:setup    # FastAPI only
```

## 🎯 Features

### Tauri Mode Features
- **Automatic Server Management**: FastAPI server starts/stops with the app
- **Process Monitoring**: Real-time server status and PID tracking
- **UI Controls**: Start/Stop buttons in the FastAPI Server tab
- **Health Monitoring**: Automatic health checks and status updates
- **Error Handling**: Comprehensive error reporting in the UI

### Web Mode Features  
- **Manual Control**: Use npm scripts to manage the server
- **Development Flexibility**: Run servers independently
- **Hot Reload**: FastAPI server supports hot reloading in dev mode

## 📱 User Interface

Access the FastAPI interface through the **"FastAPI Server"** tab in the application:

### Status Panel
- 🟢 **Green dot**: Server running
- 🔴 **Red dot**: Server stopped
- **PID Display**: Shows process ID when running in Tauri
- **Control Buttons**: Start/Stop server (Tauri mode only)

### Tool Explorer
- View all available MCP tools
- See tool descriptions and schemas
- Real-time tool loading

### Query Interface
- Send queries directly to the MCP server
- View formatted JSON responses
- Error handling and display

## 🔧 Configuration

### Environment Variables

Create `.env` file in `resource/mcp-client-python/api/`:

```env
SERVER_SCRIPT_PATH="/path/to/your/figma/mcp/server.ts"
OPENAI_API_KEY="your-openai-api-key"
FASTAPI_HOST="0.0.0.0"
FASTAPI_PORT=8000
FASTAPI_RELOAD=true
```

### Default Configuration
- **Host**: `0.0.0.0`
- **Port**: `8000`
- **MCP Server Path**: Auto-detected from project structure
- **Reload**: `true` (development mode)

## 🌐 API Endpoints

### Health & Status
```bash
GET /health          # Health check
GET /                # Server information
```

### MCP Operations
```bash
POST /query          # Send query to MCP server
GET /tools           # Get available MCP tools
```

### Example Usage
```bash
# Health check
curl http://localhost:8000/health

# Get tools
curl http://localhost:8000/tools

# Send query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Get current Figma selection"}'
```

## 🛠 Development Scripts

| Command | Description |
|---------|-------------|
| `npm run tauri:dev:auto` | Tauri with auto-managed FastAPI |
| `npm run dev:all` | Next.js + FastAPI (web mode) |
| `npm run tauri:dev:all` | Legacy: Tauri + manual FastAPI |
| `npm run fastapi:setup` | Setup and run FastAPI only |
| `npm run fastapi:dev` | Run FastAPI only (if already setup) |

## 🔍 Troubleshooting

### Common Issues

1. **"Failed to start FastAPI server"**
   - Check Python installation (`python3 --version`)
   - Verify virtual environment creation permissions
   - Check if port 8000 is available

2. **"Connection refused"**
   - Ensure FastAPI server is running
   - Check firewall settings
   - Verify port 8000 is not blocked

3. **"Import errors" in Python**
   - Virtual environment may not be activated
   - Dependencies might not be installed
   - Try deleting `venv` folder and restarting

### Debug Mode

Enable debug logging in Tauri mode:
1. Open browser dev tools in the Tauri app
2. Check console for server startup logs
3. Look for FastAPI process messages

### Manual Reset

If you encounter issues, try a clean restart:

```bash
# Remove virtual environment
rm -rf resource/mcp-client-python/api/venv

# Restart Tauri app
npm run tauri:dev:auto
```

## 📦 Production Deployment

### Docker Support

```bash
# Build Docker image
docker build -f Dockerfile.fastapi -t figma-mcp-fastapi .

# Run container
docker run -p 8000:8000 \
  -e OPENAI_API_KEY="your-key" \
  figma-mcp-fastapi
```

### Tauri Build

```bash
# Build production Tauri app (includes FastAPI)
npm run tauri:build
```

The built app will include the FastAPI server and manage it automatically.

## 🔗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI   │───▶│   FastAPI API    │───▶│   Figma MCP     │
│   (Frontend)    │    │   (Bridge)       │    │   Server        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
       │                        │
       │                ┌───────▼───────┐
       └────────────────│  Tauri App    │
                        │ (Process Mgmt) │
                        └───────────────┘
```

## 🚨 Security Notes

- FastAPI server only accepts local connections by default
- CORS is enabled for development (localhost only)
- API keys should be stored in environment variables
- Production deployments should use proper authentication

---

For more help, check the console logs in the Tauri app or run the FastAPI server manually to see detailed error messages.
