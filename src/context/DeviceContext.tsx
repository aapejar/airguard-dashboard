import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SensorReading, SystemStatus, ControlCommand, AlertItem, AlertSource, CommandRecord, EvaluationSnapshot } from '@/types/sensor';
import { config } from '@/config';
import { api } from '@/services/api';

// ── Types ────────────────────────────────────────────────

export interface ControlThresholds {
  safeThreshold: number;
  moderateThreshold: number;
  highThreshold: number;
  minOutdoorDelta: number;
  hysteresis: number;
  /** @deprecated Use moderateThreshold. */ warningThreshold?: number;
  /** @deprecated Use highThreshold. */ criticalThreshold?: number;
}

interface DeviceState {
  /** Null until the backend returns the first reading for this device. */
  latest: SensorReading | null;
  status: SystemStatus | null;
  history: SensorReading[];
  alerts: AlertItem[];
  auditLog: AlertItem[];
  commandHistory: CommandRecord[];
  thresholds: ControlThresholds;
  isLoading: boolean;
  isCommandPending: boolean;
  error: string | null;
  /** True once at least one telemetry sample has been received from the backend. */
  hasData: boolean;
  /** @deprecated Always false now (no built-in simulation). */
  isReadyState: boolean;
  /** @deprecated Always 0. */
  cycleCount: number;
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
  /** @deprecated No-op kept for compatibility. */
  resumeSimulation: () => void;
  logEvent: (
    level: AlertItem['level'],
    message: string,
    opts?: { source?: AlertSource; actor?: string },
  ) => void;
  getEvaluation: () => EvaluationSnapshot | null;
  heartbeatAge: number;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

const THRESHOLDS_KEY = 'airguard.thresholds';
const MAX_COMMAND_HISTORY = 25;

export const DEFAULT_THRESHOLDS: ControlThresholds = {
  safeThreshold: 700,
  moderateThreshold: 900,
  highThreshold: 1100,
  minOutdoorDelta: 50,
  hysteresis: 50,
};

function loadThresholds(): ControlThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_THRESHOLDS,
        ...parsed,
        safeThreshold: parsed.safeThreshold ?? DEFAULT_THRESHOLDS.safeThreshold,
        moderateThreshold: parsed.moderateThreshold ?? parsed.warningThreshold ?? DEFAULT_THRESHOLDS.moderateThreshold,
        highThreshold: parsed.highThreshold ?? parsed.criticalThreshold ?? DEFAULT_THRESHOLDS.highThreshold,
        minOutdoorDelta: parsed.minOutdoorDelta ?? DEFAULT_THRESHOLDS.minOutdoorDelta,
        hysteresis: parsed.hysteresis ?? DEFAULT_THRESHOLDS.hysteresis,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_THRESHOLDS;
}

function appendUnique(existing: SensorReading[], incoming: SensorReading, maxSize: number): SensorReading[] {
  if (existing.some(r => r.id === incoming.id)) return existing;
  const next = [...existing, incoming];
  return next.length > maxSize ? next.slice(next.length - maxSize) : next;
}

// ── Provider ─────────────────────────────────────────────

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState(config.defaultDeviceId);
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [auditLog, setAuditLog] = useState<AlertItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandRecord[]>([]);
  const [thresholds, setThresholds] = useState<ControlThresholds>(loadThresholds);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [heartbeatAge, setHeartbeatAge] = useState(0);

  const lastHeartbeatRef = useRef<number>(0);
  const commandLockRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
  }, [thresholds]);

  // ── Reset state when device changes ──────────────────
  useEffect(() => {
    setLatest(null); setStatus(null); setHistory([]); setHasData(false);
    setError(null); lastHeartbeatRef.current = 0;
  }, [deviceId]);

  // ── Poll backend ─────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [reading, sysStatus] = await Promise.all([
        api.getLatestReading(deviceId),
        api.getSystemStatus(deviceId).catch(() => null),
      ]);
      if (sysStatus) setStatus(sysStatus);
      if (reading) {
        setLatest(reading);
        setHistory(prev => appendUnique(prev, reading, config.maxHistorySize));
        setHasData(true);
        lastHeartbeatRef.current = Date.now();
      }
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(msg);
    }
  }, [deviceId]);

  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
    const pollId = setInterval(refresh, config.pollingInterval);
    return () => clearInterval(pollId);
  }, [refresh]);

  // ── Load recent history once per device change ──────
  useEffect(() => {
    let cancelled = false;
    api.getHistoricalReadings(deviceId, config.maxHistorySize)
      .then(rows => {
        if (cancelled || !rows.length) return;
        // Backend returns newest→oldest; chart expects oldest→newest
        setHistory([...rows].reverse());
      })
      .catch(() => { /* tolerate */ });
    return () => { cancelled = true; };
  }, [deviceId]);

  // ── Audit bus → audit log mirror ─────────────────────
  useEffect(() => {
    let mounted = true;
    import('@/services/auditBus').then(({ auditBus }) => {
      if (!mounted) return;
      const unsub = auditBus.subscribe(e => {
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
      cleanupRef.current = unsub;
    });
    return () => { mounted = false; cleanupRef.current?.(); };
  }, []);

  // ── Heartbeat watchdog (only meaningful once data has arrived) ─
  useEffect(() => {
    let wasOnline: boolean | null = null;
    const id = setInterval(() => {
      if (!lastHeartbeatRef.current) { setHeartbeatAge(0); return; }
      const elapsed = Date.now() - lastHeartbeatRef.current;
      setHeartbeatAge(elapsed);
      const online = elapsed < config.heartbeatTimeout;
      setStatus(prev => {
        if (!prev) return prev;
        if (prev.deviceOnline === online) { wasOnline = online; return prev; }
        if (wasOnline === true && !online) {
          setAlerts(a => [{
            id: `sys-off-${Date.now()}`,
            level: 'critical',
            message: `Device went offline — no heartbeat for ${Math.round(elapsed / 1000)}s`,
            timestamp: new Date().toISOString(),
            source: 'system',
          }, ...a]);
        } else if (wasOnline === false && online) {
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
    return () => clearInterval(id);
  }, []);

  const logEvent = useCallback(
    (
      level: AlertItem['level'],
      message: string,
      opts?: { source?: AlertSource; actor?: string },
    ) => {
      const entry: AlertItem = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        level, message,
        timestamp: new Date().toISOString(),
        source: opts?.source ?? 'system',
        actor: opts?.actor,
      };
      if (entry.source === 'system' || entry.source === 'device') {
        setAlerts(prev => [entry, ...prev]);
      } else {
        setAuditLog(prev => [entry, ...prev].slice(0, 500));
      }
    }, []);

  const sendCommand = useCallback(
    async (cmd: ControlCommand, actor?: string): Promise<boolean> => {
      if (commandLockRef.current) return false;
      commandLockRef.current = true;
      setIsCommandPending(true);
      const recordId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pendingRecord: CommandRecord = {
        id: recordId, timestamp: new Date().toISOString(), actor,
        command: cmd, result: 'pending',
      };
      setCommandHistory(prev => [pendingRecord, ...prev].slice(0, MAX_COMMAND_HISTORY));
      try {
        const result = await api.sendControlCommand(deviceId, cmd);
        if (result.success) {
          logEvent(
            'info',
            `Control command queued: Mode=${cmd.controlMode}, Fan=${cmd.fanStatus}, Damper=${cmd.damperAngle}°`,
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
    }, [deviceId, logEvent]);

  const clearHistory = useCallback(() => setHistory([]), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);
  const clearAuditLog = useCallback(() => setAuditLog([]), []);

  const resetThresholds = useCallback((actor?: string) => {
    setThresholds(DEFAULT_THRESHOLDS);
    logEvent('info', `Decision boundaries reset to defaults`, { source: 'user', actor });
  }, [logEvent]);

  const updateThresholds = useCallback(
    (t: Partial<ControlThresholds>, actor?: string) => {
      setThresholds(prev => {
        const next = { ...prev, ...t };
        logEvent('info',
          `Decision boundaries updated: safe=${next.safeThreshold}, moderate=${next.moderateThreshold}, high=${next.highThreshold}, ΔO=${next.minOutdoorDelta}, stab=±${next.hysteresis} ppm`,
          { source: 'user', actor });
        return next;
      });
    }, [logEvent]);

  const getEvaluation = useCallback((): EvaluationSnapshot | null => {
    if (!latest) return null;
    const indoor = latest.indoorCO2;
    const outdoor = latest.outdoorCO2;
    const { safeThreshold, moderateThreshold, highThreshold, minOutdoorDelta, hysteresis } = thresholds;
    const delta = indoor - outdoor;

    if (indoor < safeThreshold) {
      return {
        rule: 'level-0-safe', ventilationLevel: 0,
        ventilationLabel: 'Level 0 — Closed / Safe',
        ruleLabel: `IF indoor < ${safeThreshold} ppm`,
        decision: 'Air quality is acceptable — no ventilation required',
        recommendation: { fanStatus: 'OFF', damperAction: 'CLOSE' },
        recommendedDamperAngle: 0,
        notes: 'Supervisory layer selects Level 0. Actuators held in idle state.',
      };
    }
    if (indoor >= safeThreshold && delta < minOutdoorDelta) {
      return {
        rule: 'level-blocked-outdoor-worse', ventilationLevel: 0,
        ventilationLabel: 'Level 0 — Blocked (Outdoor Not Advantageous)',
        ruleLabel: `IF indoor ≥ ${safeThreshold} AND (indoor − outdoor) < ${minOutdoorDelta} ppm`,
        decision: 'Suppress ventilation — outdoor air offers no improvement',
        recommendation: { fanStatus: 'OFF', damperAction: 'CLOSE' },
        recommendedDamperAngle: 0,
        notes: 'Opening the damper would not reduce indoor CO₂.',
      };
    }
    if (indoor < moderateThreshold) {
      return {
        rule: 'level-1-light', ventilationLevel: 1,
        ventilationLabel: 'Level 1 — Light Ventilation',
        ruleLabel: `ELSE IF indoor < ${moderateThreshold} ppm AND Δ ≥ ${minOutdoorDelta} ppm`,
        decision: 'Mild buildup detected — apply light ventilation',
        recommendation: { fanStatus: 'OFF', damperAction: 'OPEN' },
        recommendedDamperAngle: 30,
        notes: 'Passive intake via damper; fan held off to minimise energy use.',
      };
    }
    if (indoor < highThreshold) {
      return {
        rule: 'level-2-medium', ventilationLevel: 2,
        ventilationLabel: 'Level 2 — Medium Ventilation',
        ruleLabel: `ELSE IF indoor < ${highThreshold} ppm AND Δ ≥ ${minOutdoorDelta} ppm`,
        decision: 'Elevated CO₂ — engage active ventilation',
        recommendation: { fanStatus: 'ON', damperAction: 'OPEN' },
        recommendedDamperAngle: 60,
        notes: 'Fan ON, damper at 60°. Stabilization band ±' + hysteresis + ' ppm.',
      };
    }
    return {
      rule: 'level-3-aggressive', ventilationLevel: 3,
      ventilationLabel: 'Level 3 — Aggressive Ventilation',
      ruleLabel: `ELSE indoor ≥ ${highThreshold} ppm AND Δ ≥ ${minOutdoorDelta} ppm`,
      decision: 'Critical CO₂ — maximise ventilation',
      recommendation: { fanStatus: 'ON', damperAction: 'OPEN' },
      recommendedDamperAngle: 90,
      notes: 'Highest supervisory level: damper fully open, fan running at full duty.',
    };
  }, [latest, thresholds]);

  const resumeSimulation = useCallback(() => { /* no-op (real backend only) */ }, []);

  return (
    <DeviceContext.Provider
      value={{
        deviceId, setDeviceId,
        latest, status, history, alerts, auditLog, commandHistory, thresholds,
        isLoading, isCommandPending, error,
        hasData, isReadyState: false, cycleCount: 0,
        heartbeatAge,
        sendCommand, clearHistory, clearAlerts, clearAuditLog, refresh,
        updateThresholds, resetThresholds, resumeSimulation, logEvent, getEvaluation,
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
