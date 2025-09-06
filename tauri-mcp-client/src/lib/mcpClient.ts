'use client';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
}

export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export class McpClient {
  private baseUrl: string;
  private connected: boolean = false;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<boolean> {
    try {
      // For now, we'll assume connection is successful
      // In a real implementation, you'd establish a WebSocket or stdio connection
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.connected = false;
      return false;
    }
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    // Mock data based on the actual MCP server tools
    return [
      {
        name: 'get_document_info',
        description: 'Get detailed information about the current Figma document',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_selection',
        description: 'Get information about the current selection in Figma',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_rectangle',
        description: 'Create a new rectangle in Figma',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            width: { type: 'number', description: 'Width of the rectangle' },
            height: { type: 'number', description: 'Height of the rectangle' },
            name: { type: 'string', description: 'Optional name for the rectangle' },
          },
          required: ['x', 'y', 'width', 'height'],
        },
      },
      {
        name: 'create_frame',
        description: 'Create a new frame in Figma',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            width: { type: 'number', description: 'Width of the frame' },
            height: { type: 'number', description: 'Height of the frame' },
            name: { type: 'string', description: 'Optional name for the frame' },
          },
          required: ['x', 'y', 'width', 'height'],
        },
      },
      {
        name: 'create_text',
        description: 'Create a new text element in Figma',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            text: { type: 'string', description: 'Text content' },
            fontSize: { type: 'number', description: 'Font size' },
            name: { type: 'string', description: 'Optional name for the text' },
          },
          required: ['x', 'y', 'text'],
        },
      },
      {
        name: 'join_channel',
        description: 'Join a specific channel to communicate with Figma',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'The name of the channel to join' },
          },
          required: ['channel'],
        },
      },
    ];
  }

  async callTool(toolCall: McpToolCall): Promise<McpToolResult> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      // In a real implementation, this would send the tool call to the MCP server
      // For now, we'll return mock responses
      return {
        content: [
          {
            type: 'text',
            text: `Tool '${toolCall.name}' called with arguments: ${JSON.stringify(toolCall.arguments, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error calling tool '${toolCall.name}': ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const mcpClient = new McpClient();
