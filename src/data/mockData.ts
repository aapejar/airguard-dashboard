import type { SensorReading, SystemStatus, AlertItem, SystemSettings, User } from '@/types/sensor';

const randomBetween = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

export function generateSensorReading(index: number): SensorReading {
  const now = new Date();
  now.setMinutes(now.getMinutes() - index * 5);
  const indoorCO2 = randomBetween(380, 1200);
  return {
    id: `reading-${Date.now()}-${index}`,
    indoorCO2,
    outdoorCO2: randomBetween(380, 450),
    temperature: randomBetween(22, 32),
    humidity: randomBetween(35, 75),
    tvoc: randomBetween(50, 500),
    fanSpeed: Math.round(randomBetween(0, 100)),
    damperAngle: Math.round(randomBetween(0, 90)),
    ventilationStatus: indoorCO2 > 800 ? 'active' : indoorCO2 > 600 ? 'idle' : 'idle',
    controlMode: 'AUTO',
    timestamp: now.toISOString(),
  };
}

export function generateHistoricalReadings(count: number = 50): SensorReading[] {
  return Array.from({ length: count }, (_, i) => generateSensorReading(i)).reverse();
}

export const mockLatestReading: SensorReading = {
  id: 'latest-001',
  indoorCO2: 687,
  outdoorCO2: 412,
  temperature: 26.4,
  humidity: 52.3,
  tvoc: 185,
  fanSpeed: 65,
  damperAngle: 45,
  ventilationStatus: 'active',
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
  { id: 'a1', level: 'warning', message: 'Indoor CO₂ above 600 ppm', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'a2', level: 'normal', message: 'Ventilation system activated', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'a3', level: 'critical', message: 'Indoor CO₂ exceeded 1000 ppm', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'a4', level: 'normal', message: 'Device reconnected', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

export const mockSettings: SystemSettings = {
  co2WarningThreshold: 600,
  co2CriticalThreshold: 1000,
  refreshInterval: 10,
  deviceName: 'AirGuard-ESP32-01',
  location: 'Lab Room 204',
};

export const mockUsers: User[] = [
  { id: '1', username: 'admin', role: 'admin' },
  { id: '2', username: 'operator', role: 'operator' },
  { id: '3', username: 'viewer', role: 'viewer' },
];
