'use client';

import { useState, useEffect } from 'react';
import { mcpClient, McpTool, McpToolCall, McpToolResult } from '@/lib/mcpClient';

export default function ToolExplorer() {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<McpToolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    connectToMcp();
  }, []);

  const connectToMcp = async () => {
    try {
      setLoading(true);
      const success = await mcpClient.connect();
      setConnected(success);
      
      if (success) {
        const availableTools = await mcpClient.listTools();
        setTools(availableTools);
      }
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool);
    setToolArgs({});
  };

  const handleArgChange = (argName: string, value: unknown) => {
    setToolArgs(prev => ({
      ...prev,
      [argName]: value,
    }));
  };

  const executeTool = async () => {
    if (!selectedTool) return;

    try {
      setLoading(true);
      const toolCall: McpToolCall = {
        name: selectedTool.name,
        arguments: toolArgs,
      };
      
      const result = await mcpClient.callTool(toolCall);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Failed to execute tool:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderArgInput = (argName: string, argSchema: Record<string, unknown>) => {
    const value = toolArgs[argName];
    
    switch (argSchema.type) {
      case 'number':
        return (
          <input
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => handleArgChange(argName, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={argSchema.description as string}
          />
        );
      case 'string':
        return (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleArgChange(argName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={argSchema.description as string}
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleArgChange(argName, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );
      default:
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value || '')}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleArgChange(argName, parsed);
              } catch {
                handleArgChange(argName, e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder={argSchema.description as string}
          />
        );
    }
  };

  if (!connected) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tool Explorer</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Not connected to MCP server</p>
          <button
            onClick={connectToMcp}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect to MCP'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tool Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Tools</h2>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tools.map((tool) => (
            <div
              key={tool.name}
              onClick={() => handleToolSelect(tool)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedTool?.name === tool.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-800">{tool.name}</h3>
              <p className="text-sm text-gray-600">{tool.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tool Execution */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tool Execution</h2>
        
        {selectedTool ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedTool.name}</h3>
              <p className="text-gray-600">{selectedTool.description}</p>
            </div>

            {/* Arguments */}
            {selectedTool.inputSchema.properties && Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium">Arguments:</h4>
                {Object.entries(selectedTool.inputSchema.properties || {}).map(([argName, argSchema]: [string, Record<string, unknown>]) => (
                  <div key={argName}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {argName}
                      {selectedTool.inputSchema.required?.includes(argName) && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    {renderArgInput(argName, argSchema)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No arguments required</p>
            )}

            <button
              onClick={executeTool}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Executing...' : 'Execute Tool'}
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Select a tool to execute</p>
        )}
      </div>

      {/* Results */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Results</h2>
        
        {results.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  result.isError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                {result.content.map((content, contentIndex) => (
                  <div key={contentIndex} className="mb-2">
                    {content.type === 'text' && (
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {content.text}
                      </pre>
                    )}
                    {content.type === 'image' && content.data && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:${content.mimeType || 'image/png'};base64,${content.data}`}
                        alt="Tool result"
                        className="max-w-full h-auto rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No results yet</p>
        )}
      </div>
    </div>
  );
}
