/**
 * API Service Layer — placeholder for future ESP32/backend integration.
 *
 * Future endpoints:
 *   POST /api/device/readings       — ESP32 sends sensor data
 *   POST /api/device/heartbeat      — ESP32 sends heartbeat/status
 *   GET  /api/device/command/:id    — ESP32 polls for latest control command
 *
 * Replace mock implementations with real fetch calls when backend is ready.
 */

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

// Base URL placeholder — set to your server address when deploying
// e.g. 'http://your-server-ip:3001'
const API_BASE = '';

export const api = {
  // ── Dashboard / Frontend APIs ──────────────────────────

  async getLatestReading(): Promise<SensorReading> {
    await delay(200);
    // Future: return fetch(`${API_BASE}/api/readings/latest`).then(r => r.json());
    return { ...mockLatestReading, timestamp: new Date().toISOString() };
  },

  async getHistoricalReadings(count?: number): Promise<SensorReading[]> {
    await delay(300);
    // Future: return fetch(`${API_BASE}/api/readings?limit=${count}`).then(r => r.json());
    return generateHistoricalReadings(count);
  },

  async getSystemStatus(): Promise<SystemStatus> {
    await delay(100);
    // Future: return fetch(`${API_BASE}/api/device/status`).then(r => r.json());
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
    // Future: return fetch(`${API_BASE}/api/device/command`, { method: 'POST', body: JSON.stringify(command) })
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
  // These would be server-side handlers in a real deployment.
  // Included here as reference for the expected request/response shapes.

  /** POST /api/device/readings — called by ESP32 to submit sensor data */
  async postDeviceReading(_payload: DeviceReadingPayload): Promise<{ success: boolean }> {
    await delay(200);
    console.log('[API][Device] Reading received:', _payload);
    return { success: true };
  },

  /** POST /api/device/heartbeat — called by ESP32 to report status */
  async postDeviceHeartbeat(_payload: DeviceHeartbeatPayload): Promise<{ success: boolean }> {
    await delay(100);
    console.log('[API][Device] Heartbeat received:', _payload);
    return { success: true };
  },

  /** GET /api/device/command/:deviceId — ESP32 polls for latest command */
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
