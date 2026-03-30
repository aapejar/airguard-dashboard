import type {
  SensorReading,
  SystemStatus,
  SystemSettings,
  ControlCommand,
  User,
  DeviceReadingPayload,
  DeviceHeartbeatPayload,
  DeviceCommandResponse,
} from '@/types/sensor';
import { mockLatestReading, mockSystemStatus, mockSettings, generateHistoricalReadings } from '@/data/mockData';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const API_BASE = '';

export const api = {
  // ── Frontend APIs ──────────────────────────

  async getLatestReading(): Promise<SensorReading> {
    await delay(200);
    return { ...mockLatestReading, timestamp: new Date().toISOString() };
  },

  async getHistoricalReadings(count?: number): Promise<SensorReading[]> {
    await delay(300);
    return generateHistoricalReadings(count);
  },

  async getSystemStatus(): Promise<SystemStatus> {
    await delay(100);
    return { ...mockSystemStatus, lastHeartbeat: new Date().toISOString() };
  },

  async getSettings(): Promise<SystemSettings> {
    await delay(150);
    return { ...mockSettings };
  },

  async updateSettings(settings: SystemSettings): Promise<{ success: boolean }> {
    await delay(400);
    console.log('[API] Settings updated:', settings);
    return { success: true };
  },

  async sendControlCommand(command: ControlCommand): Promise<{ success: boolean }> {
    await delay(500);
    console.log('[API] Control command sent:', command);
    return { success: true };
  },

  async login(username: string, _password: string): Promise<User | null> {
    await delay(600);
    const users: Record<string, User> = {
      admin: { id: '1', username: 'admin', role: 'admin' },
      operator: { id: '2', username: 'operator', role: 'operator' },
      viewer: { id: '3', username: 'viewer', role: 'viewer' },
    };
    return users[username] || null;
  },

  // ── ESP32 Device API Placeholders ──────────────────────

  async postDeviceReading(_payload: DeviceReadingPayload): Promise<{ success: boolean }> {
    await delay(200);
    console.log('[API][Device] Reading received:', _payload);
    return { success: true };
  },

  async postDeviceHeartbeat(_payload: DeviceHeartbeatPayload): Promise<{ success: boolean }> {
    await delay(100);
    console.log('[API][Device] Heartbeat received:', _payload);
    return { success: true };
  },

  async getDeviceCommand(_deviceId: string): Promise<DeviceCommandResponse> {
    await delay(150);
    return {
      controlMode: 'AUTO',
      fanStatus: 'ON',
      damperAngle: 45,
      updatedAt: new Date().toISOString(),
    };
  },
};
