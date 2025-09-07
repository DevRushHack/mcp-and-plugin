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

export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check if we're running in Tauri
    setIsTauri(typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined);
  }, []);

  return {
    isTauri,
    invoke: isTauri ? invoke : null,
  };
}

export interface FastAPIStatus {
  running: boolean;
  port?: number;
  pid?: number;
  health_check_url?: string;
}

export function useFastAPIStatus() {
  const [status, setStatus] = useState<FastAPIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isTauri, invoke: tauriInvoke } = useTauri();

  const checkStatus = async () => {
    if (!isTauri || !tauriInvoke) return;

    try {
      setLoading(true);
      setError(null);
      const result = await tauriInvoke<FastAPIStatus>('get_fastapi_server_status');
      setStatus(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const startServer = async () => {
    if (!isTauri || !tauriInvoke) return;

    try {
      setLoading(true);
      setError(null);
      await tauriInvoke<string>('start_fastapi_server');
      // Recheck status after starting
      setTimeout(checkStatus, 3000);
    } catch (err) {
      setError(err as string);
      setLoading(false);
    }
  };

  const stopServer = async () => {
    if (!isTauri || !tauriInvoke) return;

    try {
      setLoading(true);
      setError(null);
      await tauriInvoke<string>('stop_fastapi_server');
      // Recheck status after stopping
      setTimeout(checkStatus, 1000);
    } catch (err) {
      setError(err as string);
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    if (!isTauri || !tauriInvoke) return false;

    try {
      return await tauriInvoke<boolean>('check_fastapi_health');
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    if (isTauri) {
      checkStatus();
      // Poll server status every 10 seconds
      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isTauri]);

  return {
    status,
    loading,
    error,
    checkStatus,
    startServer,
    stopServer,
    checkHealth,
  };
}
