import { useState, useEffect, useCallback } from 'react';
import type { SensorReading, SystemStatus } from '@/types/sensor';
import { mockLatestReading, mockSystemStatus } from '@/data/mockData';

/**
 * Hook for live monitoring data.
 * Currently uses mock fallback data. When real ESP32 API is connected,
 * replace the fetch logic inside `tick()` with actual API calls.
 */
export function useLiveData(intervalMs: number = 5000) {
  const [latest, setLatest] = useState<SensorReading>({
    ...mockLatestReading,
    timestamp: new Date().toISOString(),
  });
  const [status, setStatus] = useState<SystemStatus>({
    ...mockSystemStatus,
    lastHeartbeat: new Date().toISOString(),
  });

  const tick = useCallback(() => {
    // TODO: Replace with real API call: api.getLatestReading()
    // For now, just update the timestamp to simulate connectivity
    setLatest(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
    }));
    setStatus(prev => ({
      ...prev,
      lastHeartbeat: new Date().toISOString(),
      uptime: prev.uptime + Math.round(intervalMs / 1000),
    }));
  }, [intervalMs]);

  useEffect(() => {
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs]);

  return { latest, status };
}
