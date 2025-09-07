#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Define the MCP Client class
export class FigmaMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client(
      {
        name: "figma-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          prompts: {},
          
          tools: {},
        },
      }
    );
  }

  // Connect to the MCP server
  async connect(serverCommand: string = "bun", serverArgs: string[] = ["src/talk_to_figma_mcp/server.ts"]): Promise<void> {
    try {
      console.log(`Connecting to MCP server: ${serverCommand} ${serverArgs.join(' ')}`);

      // Create transport
      this.transport = new StdioClientTransport({
        command: serverCommand,
        args: serverArgs,
      });

      // Connect the client to the transport
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('Connected to MCP server');

      // List available capabilities
      const capabilities = await this.listCapabilities();
      console.log('Server capabilities:', JSON.stringify(capabilities, null, 2));
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  // Disconnect from the MCP server
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.close();
        this.isConnected = false;
      }

      console.log('Disconnected from MCP server');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  // Check if connected
  isClientConnected(): boolean {
    return this.isConnected;
  }

  // List server capabilities
  async listCapabilities(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.client.request(
      { method: "initialize", params: {} },
      { method: "initialized", params: {} }
    );

    return response;
  }

  // List available tools
  async listTools(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.request(
        { method: "tools/list", params: {} },
        { method: "tools/list", params: {} }
      );
      return response;
    } catch (error) {
      console.error('Error listing tools:', error);
      throw error;
    }
  }

  // List available prompts
  async listPrompts(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.request(
        { method: "prompts/list", params: {} },
        { method: "prompts/list", params: {} }
      );
      return response;
    } catch (error) {
      console.error('Error listing prompts:', error);
      throw error;
    }
  }

  // Call a tool
  async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: arguments_,
          },
        },
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: arguments_,
          },
        }
      );
      return response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  // Get a prompt
  async getPrompt(promptName: string, arguments_?: Record<string, any>): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.request(
        {
          method: "prompts/get",
          params: {
            name: promptName,
            arguments: arguments_ || {},
          },
        },
        {
          method: "prompts/get",
          params: {
            name: promptName,
            arguments: arguments_ || {},
          },
        }
      );
      return response;
    } catch (error) {
      console.error(`Error getting prompt ${promptName}:`, error);
      throw error;
    }
  }

  // Convenience methods for common Figma operations

  async joinChannel(channel: string): Promise<any> {
    return this.callTool("join_channel", { channel });
  }

  async getDocumentInfo(): Promise<any> {
    return this.callTool("get_document_info", {});
  }

  async getSelection(): Promise<any> {
    return this.callTool("get_selection", {});
  }

  async readMyDesign(): Promise<any> {
    return this.callTool("read_my_design", {});
  }

  async createRectangle(params: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    parentId?: string;
  }): Promise<any> {
    return this.callTool("create_rectangle", params);
  }

  async createFrame(params: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    parentId?: string;
    fillColor?: { r: number; g: number; b: number; a?: number };
    strokeColor?: { r: number; g: number; b: number; a?: number };
    strokeWeight?: number;
    layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
    layoutWrap?: "NO_WRAP" | "WRAP";
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    primaryAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN";
    counterAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "BASELINE";
    layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
    layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
    itemSpacing?: number;
  }): Promise<any> {
    return this.callTool("create_frame", params);
  }

  async createText(params: {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontWeight?: number;
    fontColor?: { r: number; g: number; b: number; a?: number };
    name?: string;
    parentId?: string;
  }): Promise<any> {
    return this.callTool("create_text", params);
  }

  async setFillColor(params: {
    nodeId: string;
    r: number;
    g: number;
    b: number;
    a?: number;
  }): Promise<any> {
    return this.callTool("set_fill_color", params);
  }

  async moveNode(params: {
    nodeId: string;
    x: number;
    y: number;
  }): Promise<any> {
    return this.callTool("move_node", params);
  }

  async deleteNode(nodeId: string): Promise<any> {
    return this.callTool("delete_node", { nodeId });
  }

  async exportNodeAsImage(params: {
    nodeId: string;
    format?: "PNG" | "JPG" | "SVG" | "PDF";
    scale?: number;
  }): Promise<any> {
    return this.callTool("export_node_as_image", params);
  }

  async scanTextNodes(nodeId: string): Promise<any> {
    return this.callTool("scan_text_nodes", { nodeId });
  }

  async setMultipleTextContents(params: {
    nodeId: string;
    text: Array<{ nodeId: string; text: string }>;
  }): Promise<any> {
    return this.callTool("set_multiple_text_contents", params);
  }

  async getLocalComponents(): Promise<any> {
    return this.callTool("get_local_components", {});
  }

  async createComponentInstance(params: {
    componentKey: string;
    x: number;
    y: number;
  }): Promise<any> {
    return this.callTool("create_component_instance", params);
  }

  async getAnnotations(params?: {
    nodeId?: string;
    includeCategories?: boolean;
  }): Promise<any> {
    return this.callTool("get_annotations", params || {});
  }

  async setAnnotation(params: {
    nodeId: string;
    annotationId?: string;
    labelMarkdown: string;
    categoryId?: string;
    properties?: Array<{ type: string }>;
  }): Promise<any> {
    return this.callTool("set_annotation", params);
  }
}

// CLI interface for the MCP client
export class FigmaMCPClientCLI {
  private client: FigmaMCPClient;

  constructor() {
    this.client = new FigmaMCPClient();
  }

  private async executeCommand(command: string, args: string[]): Promise<void> {
    try {
      switch (command) {
        case 'connect':
          const serverCommand = args[0] || 'bun';
          const serverArgs = args.slice(1).length > 0 ? args.slice(1) : ['src/talk_to_figma_mcp/server.ts'];
          await this.client.connect(serverCommand, serverArgs);
          console.log('Successfully connected to MCP server');
          break;

        case 'list-tools':
          const tools = await this.client.listTools();
          console.log('Available tools:', JSON.stringify(tools, null, 2));
          break;

        case 'list-prompts':
          const prompts = await this.client.listPrompts();
          console.log('Available prompts:', JSON.stringify(prompts, null, 2));
          break;

        case 'join-channel':
          if (args.length === 0) {
            throw new Error('Channel name is required');
          }
          const result = await this.client.joinChannel(args[0]);
          console.log('Join channel result:', JSON.stringify(result, null, 2));
          break;

        case 'get-document-info':
          const docInfo = await this.client.getDocumentInfo();
          console.log('Document info:', JSON.stringify(docInfo, null, 2));
          break;

        case 'get-selection':
          const selection = await this.client.getSelection();
          console.log('Current selection:', JSON.stringify(selection, null, 2));
          break;

        case 'read-my-design':
          const design = await this.client.readMyDesign();
          console.log('Design info:', JSON.stringify(design, null, 2));
          break;

        case 'create-rectangle':
          if (args.length < 4) {
            throw new Error('Usage: create-rectangle <x> <y> <width> <height> [name]');
          }
          const rectResult = await this.client.createRectangle({
            x: parseFloat(args[0]),
            y: parseFloat(args[1]),
            width: parseFloat(args[2]),
            height: parseFloat(args[3]),
            name: args[4] || 'Rectangle',
          });
          console.log('Rectangle created:', JSON.stringify(rectResult, null, 2));
          break;

        case 'help':
          this.showHelp();
          break;

        default:
          console.error(`Unknown command: ${command}`);
          this.showHelp();
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
    }
  }

  private showHelp(): void {
    console.log(`
Usage: bun run mcp-client <command> [args...]

Commands:
  connect [serverCommand] [serverArgs...]  Connect to MCP server
  list-tools                              List available tools
  list-prompts                           List available prompts
  join-channel <channel>                 Join a Figma channel
  get-document-info                      Get document information
  get-selection                          Get current selection
  read-my-design                         Read current design
  create-rectangle <x> <y> <w> <h> [name] Create a rectangle
  help                                   Show this help message

Examples:
  bun run mcp-client connect
  bun run mcp-client connect bun src/talk_to_figma_mcp/server.ts
  bun run mcp-client join-channel "my-channel"
  bun run mcp-client get-document-info
  bun run mcp-client create-rectangle 100 100 200 150 "My Rectangle"
    `);
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    // Handle process cleanup
    const cleanup = async () => {
      await this.client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    await this.executeCommand(command, commandArgs);

    // Keep the process alive for interactive commands
    if (['connect', 'join-channel'].includes(command)) {
      console.log('Client ready. Press Ctrl+C to exit.');
      
      // Keep process alive
      const keepAlive = () => {
        if (this.client.isClientConnected()) {
          setTimeout(keepAlive, 1000);
        }
      };
      keepAlive();
    } else {
      await this.client.disconnect();
    }
  }
}

// If this file is run directly, start the CLI
if (typeof window === 'undefined') {
  const cli = new FigmaMCPClientCLI();
  cli.run().catch(console.error);
}
