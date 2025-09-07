'use client';

import { useState, useEffect } from 'react';
import { fastapiClient } from '../lib/fastapiClient';
import { websocketClient, ProgressUpdate, QueryResult } from '../lib/websocketClient';
import { useTauri, useFastAPIStatus } from '../hooks/useTauri';

interface FastAPIStatus {
  running: boolean;
  port?: number;
  pid?: number;
  health_check_url?: string;
}

interface ChatSession {
  id: string;
  query: string;
  timestamp: string;
  status: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface QueryAccordion {
  id: string;
  query: string;
  timestamp: string;
  messages: ChatMessage[];
  isExpanded: boolean;
  isLoading: boolean;
  progress?: ProgressUpdate;
}

export default function FastAPIManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [accordions, setAccordions] = useState<QueryAccordion[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isTauri } = useTauri();
  const { 
    status: tauriStatus, 
    loading: tauriLoading, 
    error: tauriError,
    startServer: tauriStartServer,
    stopServer: tauriStopServer,
    checkStatus: tauriCheckStatus
  } = useFastAPIStatus();

  useEffect(() => {
    checkConnection();
    loadSessions();
  }, []);

  const checkConnection = async () => {
    const connected = await fastapiClient.healthCheck();
    setIsConnected(connected);
    if (connected) {
      await loadTools();
      await loadSessions();
    }
  };

  const loadTools = async () => {
    try {
      const toolsData = await fastapiClient.getTools();
      setTools(toolsData.tools || []);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsData = await fastapiClient.getSessions();
      setSessions(sessionsData.sessions || []);
      
      // Convert sessions to accordion format
      const newAccordions = sessionsData.sessions.map((session: ChatSession) => ({
        id: session.id,
        query: session.query,
        timestamp: session.timestamp,
        messages: [],
        isExpanded: false,
        isLoading: false
      }));
      setAccordions(newAccordions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  useEffect(() => {
    // Connect to WebSocket when component mounts
    const connectWebSocket = async () => {
      try {
        await websocketClient.connect();
        setWsConnected(true);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      websocketClient.disconnect();
    };
  }, []);

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a temporary ID for the accordion
      const tempId = Date.now().toString();
      
      // Create new accordion for this query
      const newAccordion: QueryAccordion = {
        id: tempId,
        query: query,
        timestamp: new Date().toISOString(),
        messages: [],
        isExpanded: true,
        isLoading: true,
        progress: { status: 'initializing', message: 'Starting query...', progress: 0 }
      };
      
      setAccordions(prev => [newAccordion, ...prev]);
      const currentQuery = query;
      setQuery(''); // Clear input immediately
      
      // Send query via WebSocket with callbacks
      await websocketClient.sendQuery(currentQuery, undefined, {
        onProgress: (progress: ProgressUpdate) => {
          setAccordions(prev => prev.map(acc => 
            acc.id === tempId ? { ...acc, progress } : acc
          ));
        },
        onResult: async (result: QueryResult) => {
          // Update accordion with real session ID and clear loading state
          setAccordions(prev => prev.map(acc => 
            acc.id === tempId 
              ? { 
                  ...acc, 
                  id: result.session_id,
                  isLoading: false, 
                  progress: { status: 'completed', message: 'Query completed successfully', progress: 100 }
                }
              : acc
          ));
          
          // Load messages for the session
          await loadSessionMessages(result.session_id);
          await loadSessions(); // Refresh sessions list
        },
        onError: (error: string) => {
          setAccordions(prev => prev.map(acc => 
            acc.id === tempId 
              ? { 
                  ...acc, 
                  isLoading: false, 
                  progress: { status: 'error', message: `Error: ${error}`, progress: 100 }
                }
              : acc
          ));
          setError(error);
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setAccordions(prev => prev.map(acc => 
        acc.id === sessionId ? { ...acc, isLoading: true } : acc
      ));
      
      const messagesData = await fastapiClient.getSessionMessages(sessionId);
      
      setAccordions(prev => prev.map(acc => 
        acc.id === sessionId 
          ? { ...acc, messages: messagesData.messages, isLoading: false }
          : acc
      ));
    } catch (err) {
      console.error('Failed to load session messages:', err);
      setAccordions(prev => prev.map(acc => 
        acc.id === sessionId ? { ...acc, isLoading: false } : acc
      ));
    }
  };

  const toggleAccordion = async (sessionId: string) => {
    const accordion = accordions.find(acc => acc.id === sessionId);
    if (!accordion) return;

    const wasExpanded = accordion.isExpanded;
    
    // Toggle expansion
    setAccordions(prev => prev.map(acc => 
      acc.id === sessionId ? { ...acc, isExpanded: !wasExpanded } : acc
    ));

    // Load messages if expanding and not already loaded
    if (!wasExpanded && accordion.messages.length === 0) {
      await loadSessionMessages(sessionId);
    }
  };

  const deleteSessionAccordion = async (sessionId: string) => {
    try {
      await fastapiClient.deleteSession(sessionId);
      setAccordions(prev => prev.filter(acc => acc.id !== sessionId));
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
    }
  };

  const testMCPConnection = async () => {
    try {
      console.log('Testing MCP connection...');
      const mcpStatus = await fastapiClient.debugMCPStatus();
      console.log('MCP Status:', mcpStatus);
      
      const figmaTest = await fastapiClient.debugTestFigmaTool();
      console.log('Figma Tool Test:', figmaTest);
      
      alert(`MCP Connected: ${mcpStatus.mcp_connected}\\nTools: ${mcpStatus.tools_count}\\nFigma Test: ${figmaTest.success ? 'Success' : 'Failed'}`);
    } catch (err) {
      console.error('Failed to test MCP connection:', err);
      alert('Failed to test MCP connection. Check console for details.');
    }
  };

  const handleStartServer = async () => {
    if (isTauri && tauriStartServer) {
      await tauriStartServer();
      // Wait a bit then check HTTP connection
      setTimeout(() => {
        checkConnection();
      }, 3000);
    } else {
      // Fallback for web mode - user needs to start manually
      setError('Please start the FastAPI server manually using: npm run fastapi:setup');
    }
  };

  const handleStopServer = async () => {
    if (isTauri && tauriStopServer) {
      await tauriStopServer();
      setIsConnected(false);
      setSessions([]);
      setAccordions([]);
    }
  };

  // Use Tauri status when available, fallback to HTTP check
  const serverRunning = isTauri ? tauriStatus?.running : isConnected;
  const serverLoading = isTauri ? tauriLoading : loading;
  const serverError = isTauri ? tauriError : error;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">FastAPI Server Manager</h2>
        
        {/* Connection Status */}
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  serverRunning ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className={serverRunning ? 'text-green-700' : 'text-red-700'}>
                {serverRunning ? 'FastAPI Connected' : 'FastAPI Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  wsConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className={wsConnected ? 'text-green-700' : 'text-red-700'}>
                {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
              </span>
            </div>
            {isTauri && tauriStatus && (
              <span className="text-sm text-gray-500 ml-2">
                {tauriStatus.pid && `(PID: ${tauriStatus.pid})`}
                {tauriStatus.port && ` Port: ${tauriStatus.port}`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
              {isTauri && (
                <>
                  {!serverRunning && (
                    <>
                      <button
                        onClick={handleStartServer}
                        disabled={serverLoading}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {serverLoading ? 'Starting...' : 'Start Server'}
                      </button>
                      <button
                        onClick={() => {
                          // For combined start, user should use the terminal commands
                          alert('For combined start, use:\nnpm run dev:all (for web)\nnpm run tauri:dev:all (for Tauri)');
                        }}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Start All Guide
                      </button>
                    </>
                  )}
                  {serverRunning && (
                    <button
                      onClick={handleStopServer}
                      disabled={serverLoading}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {serverLoading ? 'Stopping...' : 'Stop Server'}
                    </button>
                  )}
                </>
              )}
              <button
                onClick={isTauri ? tauriCheckStatus : checkConnection}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
        </div>
        {serverError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              <strong>Error:</strong> {serverError}
            </div>
          )}
        </div>

        {/* Tools Display - Compact version */}
        {serverRunning && tools.length > 0 && (
          <div className="mb-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Available Tools ({tools.length}) ▼
              </summary>
              <div className="mt-2 grid gap-2 pl-4">
                {tools.map((tool, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <h4 className="font-medium text-xs text-gray-800">{tool.name}</h4>
                    <p className="text-xs text-gray-600">{tool.description}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Debug Section */}
        {serverRunning && (
          <div className="mb-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-800">
                Debug Tools ▼
              </summary>
              <div className="mt-2 pl-4 space-y-2">
                <button
                  onClick={testMCPConnection}
                  className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Test MCP & Figma Connection
                </button>
                <p className="text-xs text-gray-500">
                  Check console for detailed logs and connection status
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Query Interface - Moved to top */}
        {serverRunning && (
          <div className="mb-6">
            <div>
              <label htmlFor="query" className="block text-sm font-medium mb-2">
                Ask a question
              </label>
              <div className="flex gap-2">
                <input
                  id="query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to know?"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                />
                <button
                  onClick={handleQuery}
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                Error: {error}
              </div>
            )}
          </div>
        )}

        {/* Chat Sessions - Cursor-like Accordions */}
        {serverRunning && accordions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Chat History</h3>
            {accordions.map((accordion) => (
              <div key={accordion.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Accordion Header */}
                <div 
                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => toggleAccordion(accordion.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`transform transition-transform ${accordion.isExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-md">
                        {accordion.query}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(accordion.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {accordion.messages.length} messages
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSessionAccordion(accordion.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {accordion.isExpanded && (
                  <div className="p-4 bg-white border-t">
                    {accordion.isLoading ? (
                      <div className="text-center py-4">
                        {accordion.progress && (
                          <div className="space-y-3">
                            <div className="text-sm text-gray-600">{accordion.progress.message}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  accordion.progress.status === 'error' 
                                    ? 'bg-red-500' 
                                    : accordion.progress.status === 'completed'
                                    ? 'bg-green-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${accordion.progress.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {accordion.progress.progress}% - {accordion.progress.status}
                            </div>
                          </div>
                        )}
                        {!accordion.progress && (
                          <div className="text-gray-500">Loading messages...</div>
                        )}
                      </div>
                    ) : accordion.messages.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No messages found</div>
                    ) : (
                      <div className="space-y-3">
                        {accordion.messages.map((message) => (
                          <div 
                            key={message.id} 
                            className={`p-3 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${
                                message.role === 'user' ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {message.role === 'user' ? 'You' : 'Assistant'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm">
                              {message.content.startsWith('{') || message.content.startsWith('[') ? (
                                <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                                  {JSON.stringify(JSON.parse(message.content), null, 2)}
                                </pre>
                              ) : (
                                <p className="whitespace-pre-wrap">{message.content}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!serverRunning && (
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {isTauri ? (
              <div>
                <p>FastAPI server is not running. Click "Start Server" above to start it automatically.</p>
                {serverError && (
                  <p className="mt-2 text-red-600">Error: {serverError}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-3">FastAPI server is not running. Choose one of these options:</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">🚀 Combined Start (Recommended)</h4>
                    <p className="text-sm text-gray-600 mb-2">Start both frontend and backend together:</p>
                    <code className="block p-2 bg-blue-100 rounded text-sm">
                      npm run dev:all
                    </code>
                    <p className="text-xs text-gray-500 mt-1">Runs Next.js + FastAPI together</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">🔧 FastAPI Only</h4>
                    <p className="text-sm text-gray-600 mb-2">Start just the backend server:</p>
                    <code className="block p-2 bg-yellow-100 rounded text-sm">
                      npm run fastapi:setup
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">📱 Tauri Combined</h4>
                    <p className="text-sm text-gray-600 mb-2">For Tauri desktop app development:</p>
                    <code className="block p-2 bg-purple-100 rounded text-sm">
                      npm run tauri:dev:all
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

  );
}
