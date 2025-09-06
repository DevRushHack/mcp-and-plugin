# Figma MCP Client

A Tauri-based desktop application that provides a Model Context Protocol (MCP) client for interacting with Figma. This application automatically manages the MCP server, ensures Bun runtime is installed, and provides a user-friendly interface for executing Figma operations.

## Features

- 🚀 **Auto-start MCP Server**: Automatically starts the MCP server when the app launches
- 🏃‍♂️ **Bun Runtime Management**: Checks for Bun installation and installs it if needed
- 🔌 **Real-time Server Status**: Monitor the status of your MCP server and Bun runtime
- 🛠️ **Tool Explorer**: Browse and execute available MCP tools for Figma interaction
- 📱 **Native Desktop App**: Built with Tauri for optimal performance and system integration
- 🎨 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Prerequisites

- **Rust**: Required for building Tauri applications
- **Node.js**: For the Next.js frontend
- **Figma Plugin**: You'll need the corresponding Figma plugin installed and configured

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd tauri-mcp-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and run the application:
   ```bash
   npm run tauri:dev
   ```

## Usage

### Server Status Tab

The Server Status tab provides information about:

- **Bun Runtime**: Shows if Bun is installed and its version
  - If Bun is not installed, click "Install Bun" to automatically install it
- **MCP Server**: Shows if the MCP server is running
  - If the server is not running, click "Start MCP Server" to launch it

### Tool Explorer Tab

The Tool Explorer allows you to:

1. Browse available MCP tools for Figma interaction
2. Select a tool to see its description and required parameters
3. Fill in the parameters and execute the tool
4. View the results in the results panel

## Available MCP Tools

The application includes the following MCP tools for Figma:

- `get_document_info`: Get detailed information about the current Figma document
- `get_selection`: Get information about the current selection in Figma
- `create_rectangle`: Create a new rectangle in Figma
- `create_frame`: Create a new frame in Figma
- `create_text`: Create a new text element in Figma
- `join_channel`: Join a specific channel to communicate with Figma

## Development

### Project Structure

```
tauri-mcp-client/
├── src/                     # Next.js frontend source
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility libraries
├── src-tauri/               # Tauri backend source
│   ├── src/                 # Rust source code
│   └── tauri.conf.json      # Tauri configuration
├── mcp-server/              # Bundled MCP server
└── public/                  # Static assets
```

### Running in Development

1. Start the development server:
   ```bash
   npm run tauri:dev
   ```

2. The app will automatically:
   - Start the Next.js development server
   - Build and run the Tauri application
   - Hot-reload on changes

### Building for Production

```bash
npm run tauri:build
```

This will create a production build in the `src-tauri/target/release/bundle/` directory.

## Configuration

### Tauri Configuration

The Tauri configuration is in `src-tauri/tauri.conf.json`. Key settings include:

- **Plugins**: Shell and filesystem plugins are enabled for MCP server management
- **Resources**: The MCP server files are bundled with the application
- **Security**: Configured to allow necessary shell commands for Bun and Node.js

### MCP Server

The bundled MCP server includes:

- Talk to Figma MCP server (`server.ts`)
- WebSocket server for real-time communication (`socket.ts`)
- All necessary dependencies

## Troubleshooting

### Bun Installation Issues

If Bun installation fails:
1. Check your internet connection
2. Ensure you have proper permissions
3. Try installing Bun manually: `curl -fsSL https://bun.sh/install | bash`

### MCP Server Not Starting

If the MCP server fails to start:
1. Check that Bun is properly installed
2. Verify that port 3055 is not in use by another application
3. Check the application logs for error messages

### Figma Connection Issues

If you can't connect to Figma:
1. Ensure the Figma plugin is installed and running
2. Verify you're on the same channel in both the plugin and this client
3. Check that your Figma document is open and accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Check the troubleshooting section above
- Create an issue in the repository
- Refer to the [MCP documentation](https://github.com/modelcontextprotocol) for protocol details