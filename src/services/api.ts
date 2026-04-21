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
import { config } from '@/config';
import { validateSensorReading, validateSystemStatus } from '@/services/validators';
import { mockLatestReading, mockSystemStatus, mockSettings, generateHistoricalReadings } from '@/data/mockData';

// ── Helpers ─────────────────────────────────────────────

/** Simulate network latency (mock only) */
const delay = (min = 200, max = 500) =>
  new Promise<void>(r => setTimeout(r, Math.round(Math.random() * (max - min) + min)));

/** Fetch with timeout + retry */
async function fetchWithRetry<T>(
  url: string,
  opts?: RequestInit,
  retries = config.maxRetries,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

      const res = await fetch(url, {
        ...opts,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...opts?.headers },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on abort (timeout) beyond the last attempt
      if (attempt < retries) {
        await new Promise<void>(r => setTimeout(r, config.retryBaseDelay * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Request failed');
}

/** Incrementing counter so every mock reading has a unique id */
let _readingSeq = 1000;
/** Timestamp used to compute mock uptime delta */
const _bootTime = Date.now();

// ── Public API ──────────────────────────────────────────

export const api = {
  // ── Frontend → Server ─────────────────────────────

  async getLatestReading(deviceId?: string): Promise<SensorReading> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      const raw = await fetchWithRetry<unknown>(
        `${config.apiBaseUrl}/api/devices/${id}/readings/latest`,
      );
      const validated = validateSensorReading(raw);
      if (!validated) throw new Error('Invalid reading payload from server');
      return validated;
    } catch {
      // Mock fallback
      await delay(150, 300);
      _readingSeq++;
      return {
        ...mockLatestReading,
        id: `reading-${_readingSeq}`,
        deviceId: id,
        timestamp: new Date().toISOString(),
      };
    }
  },

  async getHistoricalReadings(deviceId?: string, count?: number): Promise<SensorReading[]> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      return await fetchWithRetry<SensorReading[]>(
        `${config.apiBaseUrl}/api/devices/${id}/readings?limit=${count ?? 50}`,
      );
    } catch {
      await delay(200, 400);
      return generateHistoricalReadings(count);
    }
  },

  async clearLogs(deviceId?: string): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      return await fetchWithRetry<{ success: boolean }>(
        `${config.apiBaseUrl}/api/devices/${id}/readings`,
        { method: 'DELETE' },
      );
    } catch {
      await delay(200, 400);
      console.log('[API] Logs cleared (mock)');
      return { success: true };
    }
  },

  async getSystemStatus(deviceId?: string): Promise<SystemStatus> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      const raw = await fetchWithRetry<unknown>(
        `${config.apiBaseUrl}/api/devices/${id}/status`,
      );
      const validated = validateSystemStatus(raw);
      if (!validated) throw new Error('Invalid status payload from server');
      return validated;
    } catch {
      await delay(100, 200);
      return {
        ...mockSystemStatus,
        lastHeartbeat: new Date().toISOString(),
        uptime: mockSystemStatus.uptime + Math.floor((Date.now() - _bootTime) / 1000),
      };
    }
  },

  async getSettings(deviceId?: string): Promise<SystemSettings> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      return await fetchWithRetry<SystemSettings>(
        `${config.apiBaseUrl}/api/devices/${id}/settings`,
      );
    } catch {
      await delay(100, 200);
      return { ...mockSettings };
    }
  },

  async updateSettings(deviceId: string | undefined, settings: SystemSettings): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      return await fetchWithRetry<{ success: boolean }>(
        `${config.apiBaseUrl}/api/devices/${id}/settings`,
        { method: 'PUT', body: JSON.stringify(settings) },
      );
    } catch {
      await delay(300, 600);
      console.log('[API] Settings updated (mock):', settings);
      return { success: true };
    }
  },

  async sendControlCommand(deviceId: string | undefined, command: ControlCommand): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    try {
      return await fetchWithRetry<{ success: boolean }>(
        `${config.apiBaseUrl}/api/devices/${id}/control`,
        { method: 'POST', body: JSON.stringify(command) },
      );
    } catch {
      await delay(400, 800);
      console.log('[API] Control command sent (mock):', command);
      return { success: true };
    }
  },

  async login(username: string, password: string): Promise<User | null> {
    try {
      return await fetchWithRetry<User>(
        `${config.apiBaseUrl}/api/auth/login`,
        { method: 'POST', body: JSON.stringify({ username, password }) },
      );
    } catch {
      await delay(400, 700);
      const users: Record<string, User> = {
        admin: { id: '1', username: 'admin', role: 'admin' },
        operator: { id: '2', username: 'operator', role: 'operator' },
        user: { id: '3', username: 'user', role: 'user' },
      };
      return users[username] || null;
    }
  },

  // ── ESP32 Device → Server ─────────────────────────

  async postDeviceReading(payload: DeviceReadingPayload): Promise<{ success: boolean }> {
    try {
      return await fetchWithRetry<{ success: boolean }>(
        `${config.apiBaseUrl}/api/device/readings`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    } catch {
      await delay(100, 200);
      console.log('[API][Device] Reading received (mock):', payload);
      return { success: true };
    }
  },

  async postDeviceHeartbeat(payload: DeviceHeartbeatPayload): Promise<{ success: boolean }> {
    try {
      return await fetchWithRetry<{ success: boolean }>(
        `${config.apiBaseUrl}/api/device/heartbeat`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    } catch {
      await delay(50, 150);
      console.log('[API][Device] Heartbeat received (mock):', payload);
      return { success: true };
    }
  },

  async getDeviceCommand(deviceId: string): Promise<DeviceCommandResponse> {
    try {
      return await fetchWithRetry<DeviceCommandResponse>(
        `${config.apiBaseUrl}/api/device/${deviceId}/command`,
      );
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
