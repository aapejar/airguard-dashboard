export interface SensorReading {
  id: string;
  deviceId: string;
  indoorCO2: number;
  outdoorCO2: number;
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  ventilationStatus: 'ACTIVE' | 'IDLE' | 'FAULT';
  controlMode: 'AUTO' | 'MANUAL';
  timestamp: string;
}

export interface SystemStatus {
  deviceOnline: boolean;
  lastHeartbeat: string;
  uptime: number;
  firmwareVersion: string;
  wifiSignal: number;
}

export type AlertSource = 'system' | 'device' | 'user' | 'auth';

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  /** Origin of the event — used for audit/log filtering */
  source?: AlertSource;
  /** Username that triggered the event, when applicable */
  actor?: string;
}

export interface SystemSettings {
  co2WarningThreshold: number;
  co2CriticalThreshold: number;
  refreshInterval: number;
  deviceName: string;
  location: string;
  deviceEndpoint: string;
}

export interface ControlCommand {
  controlMode: 'AUTO' | 'MANUAL';
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
}

export type UserRole = 'admin' | 'operator' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  status?: 'active' | 'disabled';
  lastLogin?: string | null;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

export interface CommandRecord {
  id: string;
  timestamp: string;
  actor?: string;
  command: ControlCommand;
  result: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface EvaluationSnapshot {
  rule:
    | 'level-0-safe'
    | 'level-1-light'
    | 'level-2-medium'
    | 'level-3-aggressive'
    | 'level-blocked-outdoor-worse'
    | 'transition-stabilizing';
  /** Supervisory ventilation level selected by the IF-ELSE decision layer */
  ventilationLevel: 0 | 1 | 2 | 3;
  /** Human label for the ventilation level (e.g., "Closed / Safe", "Light", "Medium", "Aggressive") */
  ventilationLabel: string;
  ruleLabel: string;
  decision: string;
  recommendation: { fanStatus: 'ON' | 'OFF'; damperAction: 'OPEN' | 'CLOSE' | 'HOLD' };
  /** Recommended damper angle (degrees) mapped from the ventilation level */
  recommendedDamperAngle: number;
  notes: string;
}

export interface DeviceReadingPayload {
  deviceId: string;
  apiKey: string;
  indoorCO2: number;
  outdoorCO2: number;
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  ventilationStatus: 'ACTIVE' | 'IDLE' | 'FAULT';
  controlMode: 'AUTO' | 'MANUAL';
  timestamp: string;
}

export interface DeviceHeartbeatPayload {
  deviceId: string;
  apiKey: string;
  uptime: number;
  wifiSignal: number;
  firmwareVersion: string;
}

export interface DeviceCommandResponse {
  controlMode: 'AUTO' | 'MANUAL';
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  updatedAt: string;
}
