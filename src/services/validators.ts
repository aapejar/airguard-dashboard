/**
 * Runtime validators for API payloads.
 * Ensures malformed data never enters application state.
 */

import type { SensorReading, SystemStatus, ControlCommand } from '@/types/sensor';

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateSensorReading(data: unknown): SensorReading | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (
    !isString(d.id) ||
    !isString(d.deviceId) ||
    !isNumber(d.indoorCO2) ||
    !isNumber(d.outdoorCO2) ||
    !isNumber(d.damperAngle) ||
    !isString(d.timestamp) ||
    !(d.fanStatus === 'ON' || d.fanStatus === 'OFF') ||
    !(d.ventilationStatus === 'ACTIVE' || d.ventilationStatus === 'IDLE' || d.ventilationStatus === 'FAULT') ||
    !(d.controlMode === 'AUTO' || d.controlMode === 'MANUAL')
  ) {
    return null;
  }

  // Range sanity checks
  if (d.indoorCO2 < 0 || d.indoorCO2 > 10000) return null;
  if (d.outdoorCO2 < 0 || d.outdoorCO2 > 10000) return null;
  if (d.damperAngle < 0 || d.damperAngle > 90) return null;

  return {
    id: d.id as string,
    deviceId: d.deviceId as string,
    indoorCO2: d.indoorCO2 as number,
    outdoorCO2: d.outdoorCO2 as number,
    fanStatus: d.fanStatus as 'ON' | 'OFF',
    damperAngle: d.damperAngle as number,
    ventilationStatus: d.ventilationStatus as 'ACTIVE' | 'IDLE' | 'FAULT',
    controlMode: d.controlMode as 'AUTO' | 'MANUAL',
    timestamp: d.timestamp as string,
  };
}

export function validateSystemStatus(data: unknown): SystemStatus | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (
    typeof d.deviceOnline !== 'boolean' ||
    !isString(d.lastHeartbeat) ||
    !isNumber(d.uptime) ||
    !isString(d.firmwareVersion) ||
    !isNumber(d.wifiSignal)
  ) {
    return null;
  }

  return {
    deviceOnline: d.deviceOnline,
    lastHeartbeat: d.lastHeartbeat as string,
    uptime: d.uptime as number,
    firmwareVersion: d.firmwareVersion as string,
    wifiSignal: d.wifiSignal as number,
  };
}

export function validateControlCommand(cmd: unknown): ControlCommand | null {
  if (!cmd || typeof cmd !== 'object') return null;
  const c = cmd as Record<string, unknown>;

  if (
    !(c.controlMode === 'AUTO' || c.controlMode === 'MANUAL') ||
    !(c.fanStatus === 'ON' || c.fanStatus === 'OFF') ||
    !isNumber(c.damperAngle) ||
    c.damperAngle < 0 ||
    c.damperAngle > 90
  ) {
    return null;
  }

  return {
    controlMode: c.controlMode,
    fanStatus: c.fanStatus,
    damperAngle: c.damperAngle as number,
  };
}
