import { v4 as uuidv4 } from 'uuid';

interface ProgressUpdate {
  status: string;
  message: string;
  progress: number;
}

interface QueryResult {
  session_id: string;
  messages: any[];
}

interface WebSocketMessage {
  type: 'query' | 'progress' | 'result' | 'error' | 'ping' | 'pong';
  data?: any;
  query?: string;
  session_id?: string;
}

interface QueryOptions {
  onProgress?: (progress: ProgressUpdate) => void;
  onResult?: (result: QueryResult) => void;
  onError?: (error: string) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingQueries = new Map<string, QueryOptions>();
  private isConnecting = false;

  constructor() {
    this.clientId = uuidv4();
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve(true);
          } else if (!this.isConnecting) {
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://localhost:8000/ws/${this.clientId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.ws = null;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    // For now, we'll handle progress and results globally
    // In a more complex app, you'd route based on query ID
    if (message.type === 'progress' && message.data) {
      // Find any pending query and call its progress callback
      for (const [, options] of this.pendingQueries) {
        options.onProgress?.(message.data);
      }
    } else if (message.type === 'result' && message.data) {
      // Call result callback for all pending queries (simplified)
      for (const [queryId, options] of this.pendingQueries) {
        options.onResult?.(message.data);
        this.pendingQueries.delete(queryId);
      }
    } else if (message.type === 'error' && message.data) {
      // Call error callback for all pending queries
      for (const [queryId, options] of this.pendingQueries) {
        options.onError?.(message.data.error);
        this.pendingQueries.delete(queryId);
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect().catch(console.error);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  async sendQuery(query: string, sessionId?: string, options?: QueryOptions): Promise<void> {
    if (!await this.connect()) {
      throw new Error('Failed to connect to WebSocket');
    }

    const queryId = uuidv4();
    if (options) {
      this.pendingQueries.set(queryId, options);
    }

    const message: WebSocketMessage = {
      type: 'query',
      query,
      session_id: sessionId
    };

    this.ws!.send(JSON.stringify(message));
  }

  async ping(): Promise<void> {
    if (!await this.connect()) {
      throw new Error('Failed to connect to WebSocket');
    }

    const message: WebSocketMessage = {
      type: 'ping'
    };

    this.ws!.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingQueries.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketClient = new WebSocketClient();
export type { ProgressUpdate, QueryResult, QueryOptions };
