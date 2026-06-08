import { useEffect, useState } from 'react';
import type { SensorReading, SystemStatus } from '@/types/sensor';
import { api } from '@/services/api';
import { config } from '@/config';

/** Lightweight live-data hook used by isolated widgets. Returns `null` until the
 *  backend delivers real telemetry. No mock fallback. */
export function useLiveData(intervalMs: number = config.pollingInterval, deviceId?: string) {
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const [reading, sysStatus] = await Promise.all([
          api.getLatestReading(deviceId),
          api.getSystemStatus(deviceId),
        ]);
        if (cancelled) return;
        setLatest(reading);
        setStatus(sysStatus);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch telemetry');
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs, deviceId]);

  return { latest, status, error };
}
