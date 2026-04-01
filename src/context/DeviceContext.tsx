import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SensorReading, SystemStatus, ControlCommand, AlertItem } from '@/types/sensor';
import { config } from '@/config';
import { api } from '@/services/api';
import { generateHistoricalReadings, mockAlerts } from '@/data/mockData';

// ── Types ────────────────────────────────────────────────

interface DeviceState {
  latest: SensorReading;
  status: SystemStatus;
  history: SensorReading[];
  alerts: AlertItem[];
  isLoading: boolean;
  /** True while a control command is in flight */
  isCommandPending: boolean;
  error: string | null;
}

interface DeviceContextType extends DeviceState {
  /** Active device ID */
  deviceId: string;
  /** Switch to a different device */
  setDeviceId: (id: string) => void;
  /** Send a control command; returns true on success. Debounced — rejects while pending. */
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
  deviceId: config.defaultDeviceId,
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

// ── Deduplication helper ─────────────────────────────────
function appendUnique(
  existing: SensorReading[],
  incoming: SensorReading,
  maxSize: number,
): SensorReading[] {
  if (existing.some(r => r.id === incoming.id)) return existing;
  const next = [...existing, incoming];
  return next.length > maxSize ? next.slice(next.length - maxSize) : next;
}

// ── Provider ─────────────────────────────────────────────

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState(config.defaultDeviceId);
  const [latest, setLatest] = useState<SensorReading>(initialReading);
  const [status, setStatus] = useState<SystemStatus>(initialStatus);
  const [history, setHistory] = useState<SensorReading[]>(seededHistory);
  const [alerts, setAlerts] = useState<AlertItem[]>([...mockAlerts]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastHeartbeatRef = useRef<number>(Date.now());
  const commandLockRef = useRef(false);

  // ── Fetch latest reading ───────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [reading, sysStatus] = await Promise.all([
        api.getLatestReading(deviceId),
        api.getSystemStatus(deviceId),
      ]);

      setLatest(reading);
      setStatus(sysStatus);
      setError(null);
      lastHeartbeatRef.current = Date.now();

      setHistory(prev => appendUnique(prev, reading, config.maxHistorySize));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(msg);
      console.error('[DeviceContext] refresh error:', msg);
    }
  }, [deviceId]);

  // ── Polling loop ───────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));

    const pollId = setInterval(refresh, config.pollingInterval);
    return () => clearInterval(pollId);
  }, [refresh]);

  // ── Heartbeat-based offline detection ──────────────
  useEffect(() => {
    const checkId = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setStatus(prev => ({
        ...prev,
        deviceOnline: elapsed < config.heartbeatTimeout,
      }));
    }, 3000);
    return () => clearInterval(checkId);
  }, []);

  // ── Send control command (with lock) ───────────────
  const sendCommand = useCallback(async (cmd: ControlCommand): Promise<boolean> => {
    // Prevent duplicate rapid commands
    if (commandLockRef.current) {
      console.warn('[DeviceContext] Command rejected — another command is in progress');
      return false;
    }

    commandLockRef.current = true;
    setIsCommandPending(true);

    try {
      const result = await api.sendControlCommand(deviceId, cmd);

      if (result.success) {
        // Update state from confirmed command (server-confirmed, not optimistic)
        setLatest(prev => ({
          ...prev,
          controlMode: cmd.controlMode,
          fanStatus: cmd.fanStatus,
          damperAngle: cmd.damperAngle,
          timestamp: new Date().toISOString(),
        }));

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
      commandLockRef.current = false;
      setIsCommandPending(false);
    }
  }, [deviceId]);

  // ── Clear history ──────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <DeviceContext.Provider
      value={{
        deviceId,
        setDeviceId,
        latest,
        status,
        history,
        alerts,
        isLoading,
        isCommandPending,
        error,
        sendCommand,
        clearHistory,
        refresh,
      }}
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
