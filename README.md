# WireCraft 🎨

> A powerful Model Context Protocol (MCP) integration for seamless Figma workflows

[![Version](https://img.shields.io/badge/version-0.3.3-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white)](https://tauri.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

WireCraft is a comprehensive desktop application that bridges the gap between AI assistants and Figma through the Model Context Protocol (MCP). It provides a robust, multi-component architecture for executing Figma operations with real-time feedback and session management.

## ✨ Features

### 🚀 Core Functionality
- **MCP Server Integration**: Full Model Context Protocol implementation for Figma
- **Real-time Communication**: WebSocket-based real-time updates and progress tracking
- **Session Management**: Persistent chat sessions with conversation history
- **Multi-Platform Support**: Cross-platform desktop app built with Tauri

### 🎨 Figma Integration
- **Complete Figma API Access**: Read, write, and manipulate Figma files
- **Plugin Bridge**: Seamless communication with Figma plugins
- **Batch Operations**: Efficient bulk operations on Figma elements
- **Real-time Sync**: Live updates between the app and Figma

### 🛠️ Developer Experience
- **TypeScript First**: Fully typed codebase for better development experience
- **Modern Stack**: Built with Next.js, FastAPI, and Tauri
- **Hot Reload**: Development mode with instant updates
- **Comprehensive API**: RESTful and WebSocket APIs for all operations

## 🏗️ Architecture

WireCraft consists of several interconnected components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tauri App     │    │   FastAPI Server │    │   MCP Server    │
│   (Frontend)    │◄──►│   (Python)       │◄──►│   (TypeScript)  │
│                 │    │                  │    │                 │
│ • Next.js UI    │    │ • REST API       │    │ • Figma Tools   │
│ • React Components│   │ • WebSocket      │    │ • Plugin Bridge │
│ • WebSocket Client│   │ • Session Mgmt   │    │ • Command Queue │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Session Store  │    │   Figma Plugin  │
                       │   (JSON Files)   │    │   (JavaScript)  │
                       └──────────────────┘    └─────────────────┘
```

### Components

1. **Tauri Desktop App** (`tauri-mcp-client/`)
   - Modern Next.js frontend with TypeScript
   - Real-time WebSocket communication
   - Native desktop integration

2. **FastAPI Server** (`tauri-mcp-client/resource/mcp-client-python/`)
   - Python-based API server
   - Session management and persistence
   - WebSocket support for real-time updates

3. **MCP Server** (`src/talk_to_figma_mcp/`)
   - TypeScript MCP implementation
   - Figma API integration
   - Plugin communication bridge

4. **Figma Plugin** (`src/cursor_mcp_plugin/`)
   - JavaScript plugin for Figma
   - Direct access to Figma's internal APIs
   - Real-time command execution

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Bun** (for running the MCP server)
- **Python** (v3.8 or higher)
- **Rust** (for Tauri compilation)
- **Figma Desktop App** (for plugin integration)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DevRushHack/wirecraft.git
   cd mcp-and-plugin
   ```

2. **Install dependencies:**
   ```bash
   # Install main project dependencies
   bun install
   
   # Install Tauri app dependencies
   cd tauri-mcp-client
   npm install
   ```

3. **Set up Python environment:**
   ```bash
   cd tauri-mcp-client/resource/mcp-client-python/api
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   # Create .env file in tauri-mcp-client/resource/mcp-client-python/api/
   cp .env.example .env
   # Edit .env with your OpenAI API key and other settings
   ```

### Development

1. **Start all services in development mode:**
   ```bash
   cd tauri-mcp-client
   npm run tauri:dev:all
   ```

   This command will start:
   - FastAPI server (Python backend)
   - Next.js frontend
   - Tauri desktop app
   - MCP server (automatically managed)

2. **Or start services individually:**
   ```bash
   # Terminal 1: Start FastAPI server
   cd tauri-mcp-client
   npm run fastapi:setup
   
   # Terminal 2: Start Tauri app
   npm run tauri:dev
   ```

### Building for Production

```bash
cd tauri-mcp-client
npm run tauri:build
```

## 📖 Usage

### Basic Workflow

1. **Launch WireCraft**: Start the desktop application
2. **Check Status**: Verify all services are running (Home tab)
3. **Create Session**: Use the "Create ✨" tab to start a new session
4. **Execute Commands**: Send natural language commands to interact with Figma
5. **Monitor Progress**: Watch real-time updates as commands execute

### Example Commands

```
"Create a new rectangle with red background"
"List all text layers in the current frame"
"Change the color of selected elements to blue"
"Export the current selection as PNG"
"Duplicate the selected component 5 times"
```

### API Endpoints

#### REST API (FastAPI Server)

- `GET /health` - Health check
- `POST /query` - Process a query
- `GET /tools` - List available MCP tools
- `GET /sessions` - Get all chat sessions
- `GET /sessions/{session_id}/messages` - Get session messages
- `DELETE /sessions/{session_id}` - Delete a session

#### WebSocket API

Connect to `/ws/{client_id}` for real-time communication:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/unique-client-id');

// Send a query
ws.send(JSON.stringify({
  type: 'query',
  query: 'Your command here',
  session_id: 'optional-session-id'
}));

// Receive progress updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'progress') {
    console.log('Progress:', data.data);
  } else if (data.type === 'result') {
    console.log('Result:', data.data);
  }
};
```

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in `tauri-mcp-client/resource/mcp-client-python/api/`:

```env
# OpenAI API Key (required for MCP client)
OPENAI_API_KEY=your_openai_api_key_here

# Server configuration
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
FASTAPI_RELOAD=true

# MCP Server path
SERVER_SCRIPT_PATH=/path/to/your/mcp/server.ts
```

### Figma Plugin Setup

1. Open Figma Desktop App
2. Go to Plugins → Development → Import plugin from manifest
3. Select the `manifest.json` file from `src/cursor_mcp_plugin/`
4. The plugin will be available in your Figma workspace

## 🧪 Testing

### Test FastAPI Setup
```bash
cd tauri-mcp-client
npm run test:fastapi
```

### Test MCP Connection
```bash
# Check if MCP server can connect
curl http://localhost:8000/debug/mcp-status
```

### Test Figma Integration
```bash
# Test a simple Figma tool
curl -X POST http://localhost:8000/debug/test-figma-tool
```

## 📁 Project Structure

```
├── src/                           # Main MCP server source
│   ├── talk_to_figma_mcp/        # MCP server implementation
│   └── cursor_mcp_plugin/        # Figma plugin
├── tauri-mcp-client/             # Desktop application
│   ├── src/                      # Next.js frontend
│   ├── src-tauri/               # Tauri backend
│   └── resource/                # Python FastAPI server
├── mcp-server-bundle/           # Bundled MCP server
└── scripts/                     # Build and setup scripts
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style

- Use TypeScript for new features
- Follow the existing code style
- Add tests for new functionality

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/DevRushHack/mcp-and-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DevRushHack/mcp-and-plugin/discussions)
- **Documentation**: [Wiki](https://github.com/DevRushHack/mcp-and-plugin/wiki)

## 🙏 Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol) for the MCP specification
- [Tauri](https://tauri.app) for the desktop app framework
- [FastAPI](https://fastapi.tiangolo.com) for the Python web framework
- [Figma](https://figma.com) for the design platform APIs

## 🗺️ Roadmap

- [ ] Enhanced UI/UX with more interactive components
- [ ] Support for additional design tools (Sketch, Adobe XD)
- [ ] Cloud deployment options
- [ ] Advanced AI features and automation
- [ ] Plugin marketplace integration
- [ ] Team collaboration features

---

<div align="center">
  <strong>Built with ❤️ by the WireCraft team</strong>
</div>
