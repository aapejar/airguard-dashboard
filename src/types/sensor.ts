export interface SensorReading {
  id: string;
  indoorCO2: number;
  outdoorCO2: number;
  temperature: number;
  humidity: number;
  tvoc: number;
  fanSpeed: number;
  damperAngle: number;
  ventilationStatus: 'active' | 'idle' | 'fault';
  controlMode: 'AUTO' | 'MANUAL';
  timestamp: string;
}

export interface SystemStatus {
  deviceOnline: boolean;
  lastHeartbeat: string;
  uptime: number; // seconds
  firmwareVersion: string;
  wifiSignal: number; // dBm
}

export interface AlertItem {
  id: string;
  level: 'normal' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export interface SystemSettings {
  co2WarningThreshold: number;
  co2CriticalThreshold: number;
  refreshInterval: number; // seconds
  deviceName: string;
  location: string;
}

export interface ControlCommand {
  controlMode: 'AUTO' | 'MANUAL';
  fanSpeed: number;
  damperAngle: number;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}
