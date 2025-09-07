'use client';

import { useState } from 'react';
import ServerStatus from '@/components/ServerStatus';
import ToolExplorer from '@/components/ToolExplorer';
import FastAPIManager from '@/components/FastAPIManager';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'status' | 'explorer' | 'fastapi'>('status');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              
              <h1 className="text-3xl font-bold text-gray-900">
                Figma MCP Client
              </h1>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                v0.1.0
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('status')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'status'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Server Status
                </button>
                <button
                  onClick={() => setActiveTab('explorer')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'explorer'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tool Explorer
                </button>
                <button
                  onClick={() => setActiveTab('fastapi')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'fastapi'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  FastAPI Server
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'status' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Figma MCP Client</h2>
              <p className="text-gray-600 max-w-3xl">
                This application provides a Model Context Protocol (MCP) client for interacting with Figma. 
                It automatically manages the MCP server, ensures Bun runtime is installed, and provides 
                a user-friendly interface for executing Figma operations.
              </p>
            </div>
            <ServerStatus />
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">MCP Tool Explorer</h2>
              <p className="text-gray-600 max-w-3xl">
                Explore and execute available MCP tools for Figma interaction. Make sure your MCP server 
                is running and connected to your Figma plugin before using these tools.
              </p>
            </div>
            <ToolExplorer />
          </div>
        )}

        {activeTab === 'fastapi' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">FastAPI Server</h2>
              <p className="text-gray-600 max-w-3xl">
                Direct connection to the FastAPI server for MCP operations. This provides a REST API 
                interface to interact with the Figma MCP server.
              </p>
            </div>
            <FastAPIManager />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <p className="text-gray-600 text-sm">
                Built with Tauri, Next.js, and Model Context Protocol
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com/modelcontextprotocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                MCP Documentation
              </a>
              <a
                href="https://www.figma.com/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Figma Developers
              </a>
              <a
                href="https://tauri.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Tauri
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}