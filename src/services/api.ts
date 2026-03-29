/**
 * API Service Layer — placeholder for future ESP32/backend integration.
 * Replace mock implementations with real fetch calls when backend is ready.
 */

import type { SensorReading, SystemStatus, SystemSettings, ControlCommand, User } from '@/types/sensor';
import { mockLatestReading, mockSystemStatus, mockSettings, generateHistoricalReadings } from '@/data/mockData';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const api = {
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
};
