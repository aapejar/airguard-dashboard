import { useState, useEffect, useCallback } from 'react';
import type { SensorReading, SystemStatus } from '@/types/sensor';
import { generateSensorReading, mockSystemStatus } from '@/data/mockData';

export function useLiveData(intervalMs: number = 5000) {
  const [latest, setLatest] = useState<SensorReading>(() => generateSensorReading(0));
  const [history, setHistory] = useState<SensorReading[]>(() =>
    Array.from({ length: 30 }, (_, i) => generateSensorReading(30 - i))
  );
  const [status, setStatus] = useState<SystemStatus>({
    ...mockSystemStatus,
    lastHeartbeat: new Date().toISOString(),
  });

  const tick = useCallback(() => {
    const newReading = generateSensorReading(0);
    newReading.id = `live-${Date.now()}`;
    newReading.timestamp = new Date().toISOString();
    setLatest(newReading);
    setHistory(prev => [...prev.slice(-59), newReading]);
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

  return { latest, history, status };
}
