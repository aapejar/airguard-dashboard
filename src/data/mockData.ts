import type { SensorReading, SystemStatus, AlertItem, SystemSettings, User } from '@/types/sensor';

const randomBetween = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

export function generateSensorReading(index: number): SensorReading {
  const now = new Date();
  now.setMinutes(now.getMinutes() - index * 5);
  const indoorCO2 = randomBetween(380, 1200);
  return {
    id: `reading-${Date.now()}-${index}`,
    deviceId: 'esp32-room-01',
    indoorCO2,
    outdoorCO2: randomBetween(380, 450),
    fanStatus: indoorCO2 > 600 ? 'ON' : 'OFF',
    damperAngle: Math.round(randomBetween(0, 90)),
    ventilationStatus: indoorCO2 > 800 ? 'ACTIVE' : 'IDLE',
    controlMode: 'AUTO',
    timestamp: now.toISOString(),
  };
}

export function generateHistoricalReadings(count: number = 50): SensorReading[] {
  return Array.from({ length: count }, (_, i) => generateSensorReading(i)).reverse();
}

export const mockLatestReading: SensorReading = {
  id: 'latest-001',
  deviceId: 'esp32-room-01',
  indoorCO2: 687,
  outdoorCO2: 412,
  fanStatus: 'ON',
  damperAngle: 45,
  ventilationStatus: 'ACTIVE',
  controlMode: 'AUTO',
  timestamp: new Date().toISOString(),
};

export const mockSystemStatus: SystemStatus = {
  deviceOnline: true,
  lastHeartbeat: new Date().toISOString(),
  uptime: 172800,
  firmwareVersion: 'v2.1.4',
  wifiSignal: -42,
};

export const mockAlerts: AlertItem[] = [
  { id: 'a1', level: 'warning', message: 'Indoor CO₂ above 600 ppm — ventilation increased', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'a2', level: 'info', message: 'Ventilation system activated automatically', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'a3', level: 'critical', message: 'Indoor CO₂ exceeded 1000 ppm — immediate action required', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'a4', level: 'info', message: 'Device reconnected after brief disconnection', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a5', level: 'warning', message: 'Fan switched to manual override mode', timestamp: new Date(Date.now() - 7200000).toISOString() },
];

export const mockSettings: SystemSettings = {
  co2WarningThreshold: 600,
  co2CriticalThreshold: 1000,
  refreshInterval: 10,
  deviceName: 'AirGuard-ESP32-01',
  location: 'Lab Room 204',
  deviceEndpoint: 'http://192.168.1.100',
};

export const mockUsers: User[] = [
  { id: '1', username: 'admin', role: 'admin' },
  { id: '2', username: 'operator', role: 'operator' },
  { id: '3', username: 'viewer', role: 'viewer' },
];
