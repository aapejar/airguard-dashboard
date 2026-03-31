import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SensorReading, SystemStatus, ControlCommand, AlertItem } from '@/types/sensor';
import { api } from '@/services/api';
import { generateHistoricalReadings, mockAlerts } from '@/data/mockData';

/** How long (ms) before we consider the device offline */
const HEARTBEAT_TIMEOUT = 15_000;

interface DeviceState {
  latest: SensorReading;
  status: SystemStatus;
  history: SensorReading[];
  alerts: AlertItem[];
  isLoading: boolean;
  error: string | null;
}

interface DeviceContextType extends DeviceState {
  /** Send a control command; returns true on success */
  sendCommand: (cmd: ControlCommand) => Promise<boolean>;
  /** Clear all historical logs */
  clearHistory: () => void;
  /** Force-refresh latest reading from API */
  refresh: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

// ── Seed data ────────────────────────────────────────────
const seededHistory = generateHistoricalReadings(50);

const initialReading: SensorReading = {
  id: 'initial-001',
  deviceId: 'esp32-room-01',
  indoorCO2: 633.8,
  outdoorCO2: 380.3,
  fanStatus: 'ON',
  damperAngle: 69,
  ventilationStatus: 'IDLE',
  controlMode: 'AUTO',
  timestamp: new Date().toISOString(),
};

const initialStatus: SystemStatus = {
  deviceOnline: true,
  lastHeartbeat: new Date().toISOString(),
  uptime: 172800,
  firmwareVersion: 'v2.1.4',
  wifiSignal: -42,
};

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [latest, setLatest] = useState<SensorReading>(initialReading);
  const [status, setStatus] = useState<SystemStatus>(initialStatus);
  const [history, setHistory] = useState<SensorReading[]>(seededHistory);
  const [alerts, setAlerts] = useState<AlertItem[]>([...mockAlerts]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastHeartbeatRef = useRef<number>(Date.now());

  // ── Fetch latest reading from service layer ──────────
  const refresh = useCallback(async () => {
    try {
      const [reading, sysStatus] = await Promise.all([
        api.getLatestReading(),
        api.getSystemStatus(),
      ]);

      setLatest(reading);
      setStatus(sysStatus);
      setError(null);
      lastHeartbeatRef.current = Date.now();

      // Append to history (avoid duplicates by id)
      setHistory(prev => {
        if (prev.some(r => r.id === reading.id)) return prev;
        return [...prev, reading];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(msg);
      console.error('[DeviceContext] refresh error:', msg);
    }
  }, []);

  // ── Polling loop ─────────────────────────────────────
  useEffect(() => {
    // Initial fetch
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));

    const pollId = setInterval(refresh, 5000);
    return () => clearInterval(pollId);
  }, [refresh]);

  // ── Heartbeat-based online/offline detection ─────────
  useEffect(() => {
    const checkId = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setStatus(prev => ({
        ...prev,
        deviceOnline: elapsed < HEARTBEAT_TIMEOUT,
      }));
    }, 3000);
    return () => clearInterval(checkId);
  }, []);

  // ── Send control command ─────────────────────────────
  const sendCommand = useCallback(async (cmd: ControlCommand): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await api.sendControlCommand(cmd);
      if (result.success) {
        // Reflect command in latest state immediately
        setLatest(prev => ({
          ...prev,
          controlMode: cmd.controlMode,
          fanStatus: cmd.fanStatus,
          damperAngle: cmd.damperAngle,
          timestamp: new Date().toISOString(),
        }));

        // Log the control action
        const newAlert: AlertItem = {
          id: `ctrl-${Date.now()}`,
          level: 'info',
          message: `Control command applied: Mode=${cmd.controlMode}, Fan=${cmd.fanStatus}, Damper=${cmd.damperAngle}°`,
          timestamp: new Date().toISOString(),
        };
        setAlerts(prev => [newAlert, ...prev]);
      }
      setError(null);
      return result.success;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Command failed';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Clear history ────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <DeviceContext.Provider
      value={{ latest, status, history, alerts, isLoading, error, sendCommand, clearHistory, refresh }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
