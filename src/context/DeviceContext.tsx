import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SensorReading, SystemStatus, ControlCommand, AlertItem, AlertSource, CommandRecord, EvaluationSnapshot } from '@/types/sensor';
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
  /** Real device/system alerts only (threshold breaches, disconnects, faults) */
  alerts: AlertItem[];
  /** Activity / audit trail (auth, user actions, settings, control commands) */
  auditLog: AlertItem[];
  /** Last N control commands sent, with result */
  commandHistory: CommandRecord[];
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
  clearAuditLog: () => void;
  refresh: () => Promise<void>;
  updateThresholds: (t: Partial<ControlThresholds>, actor?: string) => void;
  resetThresholds: (actor?: string) => void;
  /** Reset the cycle counter and re-arm seeded simulation */
  resumeSimulation: () => void;
  /** Append a structured event to the audit log */
  logEvent: (
    level: AlertItem['level'],
    message: string,
    opts?: { source?: AlertSource; actor?: string },
  ) => void;
  /** Compute current control logic evaluation snapshot from latest reading */
  getEvaluation: () => EvaluationSnapshot;
  /** Age (ms) since last successful heartbeat */
  heartbeatAge: number;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

const THRESHOLDS_KEY = 'airguard.thresholds';
const MAX_CYCLES = 5;
const MAX_COMMAND_HISTORY = 25;

export const DEFAULT_THRESHOLDS: ControlThresholds = {
  warningThreshold: 900,
  criticalThreshold: 1000,
  hysteresis: 100,
};

const defaultThresholds = DEFAULT_THRESHOLDS;

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
  const [alerts, setAlerts] = useState<AlertItem[]>(
    mockAlerts.map(a => ({ ...a, source: a.source ?? 'system' })),
  );
  const [auditLog, setAuditLog] = useState<AlertItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandRecord[]>([]);
  const [thresholds, setThresholds] = useState<ControlThresholds>(loadThresholds);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [isReadyState, setIsReadyState] = useState(false);
  const [heartbeatAge, setHeartbeatAge] = useState(0);

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
        // Auth and other non-system events feed the audit log only.
        const entry: AlertItem = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level: e.level,
          message: e.message,
          timestamp: new Date().toISOString(),
          source: e.source,
          actor: e.actor,
        };
        setAuditLog(prev => [entry, ...prev].slice(0, 500));
      });
      // Store cleanup on the closure
      cleanupRef.current = unsub;
    });
    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, []);

  // ── Heartbeat-based offline detection + age tracking ───
  useEffect(() => {
    let wasOnline = true;
    const checkId = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setHeartbeatAge(elapsed);
      const online = elapsed < config.heartbeatTimeout;
      setStatus(prev => {
        if (prev.deviceOnline === online) return prev;
        if (wasOnline && !online) {
          setAlerts(a => [{
            id: `sys-off-${Date.now()}`,
            level: 'critical',
            message: `Device went offline — no heartbeat for ${Math.round(elapsed / 1000)}s`,
            timestamp: new Date().toISOString(),
            source: 'system',
          }, ...a]);
        } else if (!wasOnline && online) {
          setAlerts(a => [{
            id: `sys-on-${Date.now()}`,
            level: 'info',
            message: 'Device reconnected — heartbeat restored',
            timestamp: new Date().toISOString(),
            source: 'system',
          }, ...a]);
        }
        wasOnline = online;
        return { ...prev, deviceOnline: online };
      });
    }, 2000);
    return () => clearInterval(checkId);
  }, []);

  const logEvent = useCallback(
    (
      level: AlertItem['level'],
      message: string,
      opts?: { source?: AlertSource; actor?: string },
    ) => {
      const entry: AlertItem = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        level,
        message,
        timestamp: new Date().toISOString(),
        source: opts?.source ?? 'system',
        actor: opts?.actor,
      };
      // Route: system/device → real alerts panel; user/auth → audit log
      if (entry.source === 'system' || entry.source === 'device') {
        setAlerts(prev => [entry, ...prev]);
      } else {
        setAuditLog(prev => [entry, ...prev].slice(0, 500));
      }
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
      const recordId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pendingRecord: CommandRecord = {
        id: recordId,
        timestamp: new Date().toISOString(),
        actor,
        command: cmd,
        result: 'pending',
      };
      setCommandHistory(prev => [pendingRecord, ...prev].slice(0, MAX_COMMAND_HISTORY));

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
          setCommandHistory(prev => prev.map(r => r.id === recordId ? { ...r, result: 'success' } : r));
        } else {
          setCommandHistory(prev => prev.map(r => r.id === recordId ? { ...r, result: 'failed', error: 'Device rejected command' } : r));
        }
        setError(null);
        return result.success;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Command failed';
        setError(msg);
        setCommandHistory(prev => prev.map(r => r.id === recordId ? { ...r, result: 'failed', error: msg } : r));
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
  const clearAuditLog = useCallback(() => setAuditLog([]), []);

  const resetThresholds = useCallback((actor?: string) => {
    setThresholds(DEFAULT_THRESHOLDS);
    logEvent(
      'info',
      `Thresholds reset to defaults (warn=${DEFAULT_THRESHOLDS.warningThreshold}, crit=${DEFAULT_THRESHOLDS.criticalThreshold}, hyst=${DEFAULT_THRESHOLDS.hysteresis})`,
      { source: 'user', actor },
    );
  }, [logEvent]);

  const getEvaluation = useCallback((): EvaluationSnapshot => {
    const indoor = latest.indoorCO2;
    const outdoor = latest.outdoorCO2;
    const { warningThreshold: warn, criticalThreshold: crit } = thresholds;
    if (indoor < warn) {
      return {
        rule: 'below-warning',
        ruleLabel: `Indoor CO₂ < ${warn} ppm`,
        decision: 'Air quality acceptable — no ventilation needed',
        recommendation: { fanStatus: 'OFF', damperAction: 'CLOSE' },
        notes: 'System idle. Fan off, damper closed.',
      };
    }
    if (indoor <= crit) {
      return {
        rule: 'dead-band',
        ruleLabel: `${warn} ≤ Indoor CO₂ ≤ ${crit} ppm`,
        decision: 'Inside hysteresis dead-band — hold previous state',
        recommendation: { fanStatus: latest.fanStatus, damperAction: 'HOLD' },
        notes: `Dead-band ±${thresholds.hysteresis} ppm prevents oscillation.`,
      };
    }
    if (outdoor < indoor) {
      return {
        rule: 'above-critical-outdoor-cleaner',
        ruleLabel: `Indoor > ${crit} ppm AND Outdoor < Indoor`,
        decision: 'Ventilate — outdoor air is cleaner',
        recommendation: { fanStatus: 'ON', damperAction: 'OPEN' },
        notes: 'Pull cleaner outdoor air to reduce indoor CO₂.',
      };
    }
    return {
      rule: 'above-critical-outdoor-worse',
      ruleLabel: `Indoor > ${crit} ppm AND Outdoor ≥ Indoor`,
      decision: 'Keep sealed — outdoor air is worse',
      recommendation: { fanStatus: 'OFF', damperAction: 'CLOSE' },
      notes: 'Protect indoor environment until outdoor improves.',
    };
  }, [latest, thresholds]);

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
        auditLog,
        commandHistory,
        thresholds,
        isLoading,
        isCommandPending,
        error,
        cycleCount,
        isReadyState,
        heartbeatAge,
        sendCommand,
        clearHistory,
        clearAlerts,
        clearAuditLog,
        refresh,
        updateThresholds,
        resetThresholds,
        resumeSimulation,
        logEvent,
        getEvaluation,
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
