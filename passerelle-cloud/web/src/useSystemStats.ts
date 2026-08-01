import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionData } from './types';
import { usePolling } from './hooks/usePolling';

export interface GpuInfo {
  name: string;
  utilization: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
}

export interface SystemStats {
  cpuPercent: number;
  cores: number;
  memTotal: number;
  memUsed: number;
  memPercent: number;
  gpus?: GpuInfo[];
  load1: number;
  load5: number;
  load15: number;
  uptime: number;
  hostname?: string;
  platform?: string;
  arch?: string;
}

export interface SystemStatsState {
  current: SystemStats | null;
  history: SystemStats[];
  error: string | null;
  loading: boolean;
}

const MAX_HISTORY = 30;

export function useSystemStats(
  sess: SessionData | null,
  intervalMs = 2000,
): SystemStatsState {
  const [current, setCurrent] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<SystemStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessRef = useRef(sess);
  sessRef.current = sess;

  const fetchStats = useCallback(async () => {
    const activeSess = sessRef.current;
    if (!activeSess) return;
    try {
      const proxyUrl = `/api/proxy?machineId=${encodeURIComponent(activeSess.machineId)}&path=${encodeURIComponent('/api/stats')}`;
      const res = await fetch(proxyUrl, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('stats failed');
      const data: SystemStats = await res.json();
      setCurrent(data);
      setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), data]);
      setError(null);
    } catch (_e) {
      setError('stats_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sess) {
      setCurrent(null);
      setHistory([]);
      setLoading(true);
      return;
    }
    fetchStats();
  }, [sess, fetchStats]);

  // Polling: pause while the tab is hidden, refresh immediately on focus.
  usePolling(fetchStats, intervalMs, !!sess);

  return { current, history, error, loading };
}
