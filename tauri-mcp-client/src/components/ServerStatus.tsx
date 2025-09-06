'use client';

import { useBunStatus, useMcpServer } from '@/hooks/useTauri';

export default function ServerStatus() {
  const { status: bunStatus, loading: bunLoading, error: bunError, installBun } = useBunStatus();
  const { status: serverStatus, loading: serverLoading, error: serverError, installed: serverInstalled, installServer, startServer } = useMcpServer();

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Server Status</h2>
      
      {/* Bun Status */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="mr-2">🏃‍♂️</span>
          Bun Runtime
        </h3>
        
        {bunLoading ? (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
            <span>Checking Bun installation...</span>
          </div>
        ) : bunError ? (
          <div className="text-red-600">
            <p className="mb-2">Error: {bunError}</p>
          </div>
        ) : bunStatus ? (
          <div className="space-y-2">
            <div className={`flex items-center ${bunStatus.installed ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{bunStatus.installed ? '✅' : '❌'}</span>
              <span>{bunStatus.installed ? 'Installed' : 'Not Installed'}</span>
            </div>
            
            {bunStatus.installed && (
              <>
                {bunStatus.version && (
                  <p className="text-sm text-gray-600">Version: {bunStatus.version}</p>
                )}
                {bunStatus.path && (
                  <p className="text-sm text-gray-600">Path: {bunStatus.path}</p>
                )}
              </>
            )}
            
            {!bunStatus.installed && (
              <button
                onClick={installBun}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Install Bun
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* MCP Server Status */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="mr-2">🔌</span>
          MCP Server
        </h3>
        
        {serverLoading ? (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
            <span>Checking server status...</span>
          </div>
        ) : serverError ? (
          <div className="text-red-600">
            <p className="mb-2">Error: {serverError}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Installation Status */}
            <div className="space-y-2">
              <div className={`flex items-center ${serverInstalled ? 'text-green-600' : 'text-yellow-600'}`}>
                <span className="mr-2">{serverInstalled ? '✅' : '⚠️'}</span>
                <span>{serverInstalled ? 'Installed in ~/.wirecraft' : 'Not Installed'}</span>
              </div>
              
              {!serverInstalled && (
                <button
                  onClick={installServer}
                  disabled={!bunStatus?.installed}
                  className={`px-4 py-2 rounded transition-colors ${
                    bunStatus?.installed 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!bunStatus?.installed ? 'Install Bun first' : ''}
                >
                  Install MCP Server
                </button>
              )}
            </div>

            {/* Running Status */}
            {serverInstalled && serverStatus && (
              <div className="space-y-2 border-t pt-3">
                <div className={`flex items-center ${serverStatus.running ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-2">{serverStatus.running ? '🟢' : '🔴'}</span>
                  <span>{serverStatus.running ? 'Running' : 'Stopped'}</span>
                </div>
                
                {serverStatus.running && (
                  <>
                    {serverStatus.port && (
                      <p className="text-sm text-gray-600">Port: {serverStatus.port}</p>
                    )}
                    {serverStatus.pid && (
                      <p className="text-sm text-gray-600">PID: {serverStatus.pid}</p>
                    )}
                  </>
                )}
                
                {!serverStatus.running && bunStatus?.installed && (
                  <button
                    onClick={startServer}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Start MCP Server
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Instructions */}
      {serverStatus?.running && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Connection Ready!</h4>
          <p className="text-blue-700 text-sm">
            Your MCP server is running and ready to communicate with Figma. 
            Make sure your Figma plugin is installed and connected to the same channel.
          </p>
        </div>
      )}
    </div>
  );
}
