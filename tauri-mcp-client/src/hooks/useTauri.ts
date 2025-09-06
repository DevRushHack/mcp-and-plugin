'use client';

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

export interface BunStatus {
  installed: boolean;
  version?: string;
  path?: string;
}

export interface McpServerStatus {
  running: boolean;
  port?: number;
  pid?: number;
}

export function useBunStatus() {
  const [status, setStatus] = useState<BunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkBun = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<BunStatus>('check_bun_installation');
      setStatus(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const installBun = async () => {
    try {
      setLoading(true);
      setError(null);
      await invoke<string>('install_bun');
      // Recheck status after installation
      await checkBun();
    } catch (err) {
      setError(err as string);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBun();
  }, []);

  return {
    status,
    loading,
    error,
    checkBun,
    installBun,
  };
}

export function useMcpServer() {
  const [status, setStatus] = useState<McpServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<McpServerStatus>('get_mcp_server_status');
      setStatus(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const checkInstallation = async () => {
    try {
      const result = await invoke<boolean>('check_mcp_server_installation');
      setInstalled(result);
    } catch (err) {
      setError(err as string);
      setInstalled(false);
    }
  };

  const installServer = async () => {
    try {
      setLoading(true);
      setError(null);
      await invoke<string>('install_mcp_server');
      await checkInstallation(); // Recheck installation status
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const startServer = async () => {
    try {
      setLoading(true);
      setError(null);
      await invoke<string>('start_mcp_server');
      // Recheck status after starting
      setTimeout(checkStatus, 2000); // Wait a bit for server to start
    } catch (err) {
      setError(err as string);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInstallation();
    checkStatus();
    // Poll server status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    loading,
    error,
    installed,
    checkStatus,
    checkInstallation,
    installServer,
    startServer,
  };
}
