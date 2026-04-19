import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SensorReading, SystemStatus, ControlCommand, AlertItem, AlertSource } from '@/types/sensor';
import { config } from '@/config';
import { api } from '@/services/api';
import { generateHistoricalReadings, mockAlerts } from '@/data/mockData';

// ── Types ────────────────────────────────────────────────

export interface ControlThresholds {
  /** Lower threshold (ppm). Below → fan OFF */
  warningThreshold: number;
  /** Upper threshold (ppm). Above → fan ON */
  criticalThreshold: number;
  /** Hysteresis dead-band (ppm) */
  hysteresis: number;
}

interface DeviceState {
  latest: SensorReading;
  status: SystemStatus;
  history: SensorReading[];
  alerts: AlertItem[];
  thresholds: ControlThresholds;
  isLoading: boolean;
  isCommandPending: boolean;
  error: string | null;
  /** Count of polling cycles completed since last reset */
  cycleCount: number;
  /** True when system has entered "ready / waiting for real data" state */
  isReadyState: boolean;
}

interface DeviceContextType extends DeviceState {
  deviceId: string;
  setDeviceId: (id: string) => void;
  sendCommand: (cmd: ControlCommand, actor?: string) => Promise<boolean>;
  clearHistory: () => void;
  clearAlerts: () => void;
  refresh: () => Promise<void>;
  updateThresholds: (t: Partial<ControlThresholds>, actor?: string) => void;
  /** Reset the cycle counter and re-arm seeded simulation */
  resumeSimulation: () => void;
  /** Append a structured event to the audit log */
  logEvent: (
    level: AlertItem['level'],
    message: string,
    opts?: { source?: AlertSource; actor?: string },
  ) => void;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

const THRESHOLDS_KEY = 'airguard.thresholds';
const MAX_CYCLES = 5;

const defaultThresholds: ControlThresholds = {
  warningThreshold: 900,
  criticalThreshold: 1000,
  hysteresis: 100,
};

function loadThresholds(): ControlThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    if (raw) return { ...defaultThresholds, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultThresholds;
}

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

function appendUnique(existing: SensorReading[], incoming: SensorReading, maxSize: number): SensorReading[] {
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
  const [thresholds, setThresholds] = useState<ControlThresholds>(loadThresholds);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [isReadyState, setIsReadyState] = useState(false);

  const lastHeartbeatRef = useRef<number>(Date.now());
  const commandLockRef = useRef(false);
  const isReadyStateRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Persist thresholds
  useEffect(() => {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
  }, [thresholds]);

  // ── Fetch latest reading ───────────────────────────
  const refresh = useCallback(async () => {
    if (isReadyStateRef.current) return; // paused — waiting for real data
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

      setCycleCount(prev => {
        const next = prev + 1;
        if (next >= MAX_CYCLES) {
          isReadyStateRef.current = true;
          setIsReadyState(true);
          setAlerts(a => [
            {
              id: `sys-${Date.now()}`,
              level: 'info',
              message: 'Seeded simulation completed — system ready, awaiting real device data',
              timestamp: new Date().toISOString(),
              source: 'system',
            },
            ...a,
          ]);
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(msg);
      console.error('[DeviceContext] refresh error:', msg);
    }
  }, [deviceId]);

  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
    const pollId = setInterval(refresh, config.pollingInterval);
    return () => clearInterval(pollId);
  }, [refresh]);

  // ── Subscribe to auth/audit events from outside the provider tree ─
  useEffect(() => {
    // Lazy import to avoid circular deps if any
    let mounted = true;
    import('@/services/auditBus').then(({ auditBus }) => {
      if (!mounted) return;
      const unsub = auditBus.subscribe(e => {
        setAlerts(prev => [
          {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            level: e.level,
            message: e.message,
            timestamp: new Date().toISOString(),
            source: e.source,
            actor: e.actor,
          },
          ...prev,
        ]);
      });
      // Store cleanup on the closure
      cleanupRef.current = unsub;
    });
    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, []);

  // ── Heartbeat-based offline detection ──────────────
  useEffect(() => {
    const checkId = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setStatus(prev => ({ ...prev, deviceOnline: elapsed < config.heartbeatTimeout }));
    }, 3000);
    return () => clearInterval(checkId);
  }, []);

  const logEvent = useCallback(
    (
      level: AlertItem['level'],
      message: string,
      opts?: { source?: AlertSource; actor?: string },
    ) => {
      setAlerts(prev => [
        {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level,
          message,
          timestamp: new Date().toISOString(),
          source: opts?.source ?? 'system',
          actor: opts?.actor,
        },
        ...prev,
      ]);
    },
    [],
  );

  const sendCommand = useCallback(
    async (cmd: ControlCommand, actor?: string): Promise<boolean> => {
      if (commandLockRef.current) {
        console.warn('[DeviceContext] Command rejected — another command is in progress');
        return false;
      }
      commandLockRef.current = true;
      setIsCommandPending(true);

      try {
        const result = await api.sendControlCommand(deviceId, cmd);
        if (result.success) {
          setLatest(prev => ({
            ...prev,
            controlMode: cmd.controlMode,
            fanStatus: cmd.fanStatus,
            damperAngle: cmd.damperAngle,
            timestamp: new Date().toISOString(),
          }));
          logEvent(
            'info',
            `Control command applied: Mode=${cmd.controlMode}, Fan=${cmd.fanStatus}, Damper=${cmd.damperAngle}°`,
            { source: 'user', actor },
          );
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
    },
    [deviceId, logEvent],
  );

  const clearHistory = useCallback(() => setHistory([]), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  const updateThresholds = useCallback(
    (t: Partial<ControlThresholds>, actor?: string) => {
      setThresholds(prev => {
        const next = { ...prev, ...t };
        logEvent(
          'info',
          `Thresholds updated: warn=${next.warningThreshold}ppm, crit=${next.criticalThreshold}ppm, hyst=${next.hysteresis}ppm`,
          { source: 'user', actor },
        );
        return next;
      });
    },
    [logEvent],
  );

  const resumeSimulation = useCallback(() => {
    isReadyStateRef.current = false;
    setIsReadyState(false);
    setCycleCount(0);
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
        thresholds,
        isLoading,
        isCommandPending,
        error,
        cycleCount,
        isReadyState,
        sendCommand,
        clearHistory,
        clearAlerts,
        refresh,
        updateThresholds,
        resumeSimulation,
        logEvent,
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
