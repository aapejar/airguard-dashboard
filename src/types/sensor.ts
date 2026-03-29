export interface SensorReading {
  id: string;
  deviceId: string;
  indoorCO2: number;
  outdoorCO2: number;
  tvoc: number;
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  ventilationStatus: 'ACTIVE' | 'IDLE' | 'FAULT';
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
  deviceEndpoint: string; // placeholder for ESP32 endpoint URL
}

export interface ControlCommand {
  controlMode: 'AUTO' | 'MANUAL';
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

/** Payload structure for ESP32 HTTP POST to /api/device/readings */
export interface DeviceReadingPayload {
  deviceId: string;
  apiKey: string;
  indoorCO2: number;
  outdoorCO2: number;
  tvoc: number;
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  ventilationStatus: 'ACTIVE' | 'IDLE' | 'FAULT';
  controlMode: 'AUTO' | 'MANUAL';
  timestamp: string;
}

/** Payload structure for ESP32 heartbeat POST to /api/device/heartbeat */
export interface DeviceHeartbeatPayload {
  deviceId: string;
  apiKey: string;
  uptime: number;
  wifiSignal: number;
  firmwareVersion: string;
}

/** Response structure for GET /api/device/command/:deviceId */
export interface DeviceCommandResponse {
  controlMode: 'AUTO' | 'MANUAL';
  fanStatus: 'ON' | 'OFF';
  damperAngle: number;
  updatedAt: string;
}
