import type {
  SensorReading,
  SystemStatus,
  SystemSettings,
  ControlCommand,
  DeviceReadingPayload,
  DeviceHeartbeatPayload,
  DeviceCommandResponse,
} from '@/types/sensor';
import { config } from '@/config';
import { validateSensorReading, validateSystemStatus } from '@/services/validators';
import { tokenStore } from '@/services/tokenStore';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) { tokenStore.clear(); return false; }
      const data = await res.json();
      if (data?.tokens?.access && data?.tokens?.refresh) {
        tokenStore.set({ access: data.tokens.access, refresh: data.tokens.refresh });
        return true;
      }
      return false;
    } catch { return false; }
    finally { refreshInFlight = null; }
  })();
  return refreshInFlight;
}

/** Fetch with timeout, JSON envelope error handling, and one-shot 401 → refresh. */
export async function apiFetch<T>(
  url: string,
  opts?: RequestInit,
  retries = config.maxRetries,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

      const access = tokenStore.access;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opts?.headers as Record<string, string> | undefined),
      };
      if (access) headers['Authorization'] = `Bearer ${access}`;

      const res = await fetch(url, { ...opts, signal: controller.signal, headers });
      clearTimeout(timeoutId);

      if (res.status === 401 && attempt === 0 && tokenStore.refresh) {
        const ok = await tryRefresh();
        if (ok) continue;
      }

      if (!res.ok) {
        let body: any = null;
        try { body = await res.json(); } catch { /* ignore */ }
        throw new ApiError(
          res.status,
          body?.error?.code ?? `HTTP_${res.status}`,
          body?.error?.message ?? `${res.status} ${res.statusText}`,
          body?.error?.details,
        );
      }

      if (res.status === 204) return undefined as unknown as T;
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408) throw err;
      if (attempt < retries) {
        await new Promise<void>(r => setTimeout(r, config.retryBaseDelay * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Request failed');
}

// ── Public API ──────────────────────────────────────────

export const api = {
  /** Returns the latest reading, or `null` when no telemetry has been received yet (HTTP 204). */
  async getLatestReading(deviceId?: string): Promise<SensorReading | null> {
    const id = deviceId ?? config.defaultDeviceId;
    const raw = await apiFetch<unknown>(`${config.apiBaseUrl}/api/devices/${id}/readings/latest`);
    if (!raw) return null;
    const validated = validateSensorReading(raw);
    if (!validated) throw new ApiError(502, 'INVALID_PAYLOAD', 'Server returned invalid reading payload');
    return validated;
  },

  async getHistoricalReadings(deviceId?: string, count = 100): Promise<SensorReading[]> {
    const id = deviceId ?? config.defaultDeviceId;
    const rows = await apiFetch<SensorReading[]>(
      `${config.apiBaseUrl}/api/devices/${id}/readings?limit=${count}`,
    );
    return Array.isArray(rows) ? rows : [];
  },

  async clearLogs(deviceId?: string): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    return apiFetch(`${config.apiBaseUrl}/api/devices/${id}/readings`, { method: 'DELETE' });
  },

  async getSystemStatus(deviceId?: string): Promise<SystemStatus> {
    const id = deviceId ?? config.defaultDeviceId;
    const raw = await apiFetch<unknown>(`${config.apiBaseUrl}/api/devices/${id}/status`);
    const validated = validateSystemStatus(raw);
    if (!validated) throw new ApiError(502, 'INVALID_PAYLOAD', 'Server returned invalid status payload');
    return validated;
  },

  async getSettings(deviceId?: string): Promise<SystemSettings> {
    const id = deviceId ?? config.defaultDeviceId;
    const data = await apiFetch<{ settings: SystemSettings } | SystemSettings>(
      `${config.apiBaseUrl}/api/devices/${id}/settings`,
    );
    return (data as any).settings ?? (data as SystemSettings);
  },

  async updateSettings(deviceId: string | undefined, settings: SystemSettings): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    await apiFetch(`${config.apiBaseUrl}/api/devices/${id}/settings`, {
      method: 'PUT', body: JSON.stringify(settings),
    });
    return { success: true };
  },

  async sendControlCommand(deviceId: string | undefined, command: ControlCommand): Promise<{ success: boolean }> {
    const id = deviceId ?? config.defaultDeviceId;
    const r = await apiFetch<{ success: boolean }>(
      `${config.apiBaseUrl}/api/devices/${id}/control`,
      { method: 'POST', body: JSON.stringify(command) },
    );
    return { success: r?.success ?? true };
  },

  // ── ESP32 Device → Server (consumed by firmware, exposed here for parity) ─
  postDeviceReading: (p: DeviceReadingPayload) =>
    apiFetch<{ success: boolean }>(`${config.apiBaseUrl}/api/device/readings`, { method: 'POST', body: JSON.stringify(p) }),
  postDeviceHeartbeat: (p: DeviceHeartbeatPayload) =>
    apiFetch<{ success: boolean }>(`${config.apiBaseUrl}/api/device/heartbeat`, { method: 'POST', body: JSON.stringify(p) }),
  getDeviceCommand: (deviceId: string) =>
    apiFetch<DeviceCommandResponse>(`${config.apiBaseUrl}/api/device/${deviceId}/command`),
};
