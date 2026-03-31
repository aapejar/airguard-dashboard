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

const API_BASE = '';

/**
 * Simulate network latency (replaced with real fetch when backend is connected).
 * Uses a randomised range for realism.
 */
const delay = (min = 200, max = 500) =>
  new Promise(r => setTimeout(r, Math.round(Math.random() * (max - min) + min)));

/**
 * Wraps a fetch-like call with basic error handling.
 * When a real backend is available, swap the body of each method
 * with `return fetchJson(`${API_BASE}/api/…`)`.
 */
async function fetchJson<T>(_url: string, _opts?: RequestInit): Promise<T> {
  // TODO: uncomment when real backend is available
  // const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  // if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  // return res.json();
  throw new Error('Real API not connected — using mock fallback');
}

/** Incrementing counter so every mock reading has a unique id */
let _readingSeq = 1000;

export const api = {
  // ── Frontend → Server APIs ─────────────────────────

  async getLatestReading(): Promise<SensorReading> {
    try {
      return await fetchJson<SensorReading>(`${API_BASE}/api/readings/latest`);
    } catch {
      // Mock fallback — return a stable snapshot with updated timestamp
      await delay(150, 300);
      _readingSeq++;
      return {
        ...mockLatestReading,
        id: `reading-${_readingSeq}`,
        timestamp: new Date().toISOString(),
      };
    }
  },

  async getHistoricalReadings(count?: number): Promise<SensorReading[]> {
    try {
      return await fetchJson<SensorReading[]>(`${API_BASE}/api/readings?limit=${count ?? 50}`);
    } catch {
      await delay(200, 400);
      return generateHistoricalReadings(count);
    }
  },

  async clearLogs(): Promise<{ success: boolean }> {
    try {
      return await fetchJson<{ success: boolean }>(`${API_BASE}/api/readings`, { method: 'DELETE' });
    } catch {
      await delay(200, 400);
      console.log('[API] Logs cleared (mock)');
      return { success: true };
    }
  },

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      return await fetchJson<SystemStatus>(`${API_BASE}/api/status`);
    } catch {
      await delay(100, 200);
      return {
        ...mockSystemStatus,
        lastHeartbeat: new Date().toISOString(),
        uptime: mockSystemStatus.uptime + Math.floor((Date.now() - _bootTime) / 1000),
      };
    }
  },

  async getSettings(): Promise<SystemSettings> {
    try {
      return await fetchJson<SystemSettings>(`${API_BASE}/api/settings`);
    } catch {
      await delay(100, 200);
      return { ...mockSettings };
    }
  },

  async updateSettings(settings: SystemSettings): Promise<{ success: boolean }> {
    try {
      return await fetchJson<{ success: boolean }>(`${API_BASE}/api/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch {
      await delay(300, 600);
      console.log('[API] Settings updated (mock):', settings);
      return { success: true };
    }
  },

  async sendControlCommand(command: ControlCommand): Promise<{ success: boolean }> {
    try {
      return await fetchJson<{ success: boolean }>(`${API_BASE}/api/control`, {
        method: 'POST',
        body: JSON.stringify(command),
      });
    } catch {
      await delay(400, 800);
      console.log('[API] Control command sent (mock):', command);
      return { success: true };
    }
  },

  async login(username: string, _password: string): Promise<User | null> {
    try {
      return await fetchJson<User>(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password: _password }),
      });
    } catch {
      await delay(400, 700);
      const users: Record<string, User> = {
        admin: { id: '1', username: 'admin', role: 'admin' },
        operator: { id: '2', username: 'operator', role: 'operator' },
        viewer: { id: '3', username: 'viewer', role: 'viewer' },
      };
      return users[username] || null;
    }
  },

  // ── ESP32 Device → Server APIs ─────────────────────

  async postDeviceReading(payload: DeviceReadingPayload): Promise<{ success: boolean }> {
    try {
      return await fetchJson<{ success: boolean }>(`${API_BASE}/api/device/readings`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      await delay(100, 200);
      console.log('[API][Device] Reading received (mock):', payload);
      return { success: true };
    }
  },

  async postDeviceHeartbeat(payload: DeviceHeartbeatPayload): Promise<{ success: boolean }> {
    try {
      return await fetchJson<{ success: boolean }>(`${API_BASE}/api/device/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      await delay(50, 150);
      console.log('[API][Device] Heartbeat received (mock):', payload);
      return { success: true };
    }
  },

  async getDeviceCommand(deviceId: string): Promise<DeviceCommandResponse> {
    try {
      return await fetchJson<DeviceCommandResponse>(`${API_BASE}/api/device/${deviceId}/command`);
    } catch {
      await delay(100, 200);
      return {
        controlMode: 'AUTO',
        fanStatus: 'ON',
        damperAngle: 45,
        updatedAt: new Date().toISOString(),
      };
    }
  },
};

/** Timestamp used to compute mock uptime delta */
const _bootTime = Date.now();
