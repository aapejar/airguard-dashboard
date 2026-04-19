/**
 * Centralized application configuration.
 * Switch between environments by changing ENV or setting window.__AIRGUARD_CONFIG__.
 */

type Environment = 'development' | 'production';

interface AppConfig {
  /** Current environment */
  env: Environment;
  /** Base URL for all API calls (empty string = same origin) */
  apiBaseUrl: string;
  /** Polling interval for sensor data (ms) */
  pollingInterval: number;
  /** HTTP request timeout (ms) */
  requestTimeout: number;
  /** Max retry attempts for failed API calls */
  maxRetries: number;
  /** Delay between retries (ms) — multiplied by attempt number */
  retryBaseDelay: number;
  /** If no heartbeat within this window, device is offline (ms) */
  heartbeatTimeout: number;
  /** Maximum history entries kept in memory */
  maxHistorySize: number;
  /** Default device ID when none is specified */
  defaultDeviceId: string;
  /** Auto-logout after this many ms of inactivity */
  sessionInactivityTimeout: number;
  /** Maximum failed login attempts before temporary lockout */
  maxLoginAttempts: number;
  /** Lockout duration after exceeding max attempts (ms) */
  loginLockoutDuration: number;
}

const defaults: Record<Environment, AppConfig> = {
  development: {
    env: 'development',
    apiBaseUrl: '',
    pollingInterval: 5_000,
    requestTimeout: 8_000,
    maxRetries: 2,
    retryBaseDelay: 1_000,
    heartbeatTimeout: 15_000,
    maxHistorySize: 500,
    defaultDeviceId: 'esp32-room-01',
  },
  production: {
    env: 'production',
    apiBaseUrl: '',
    pollingInterval: 5_000,
    requestTimeout: 10_000,
    maxRetries: 3,
    retryBaseDelay: 2_000,
    heartbeatTimeout: 15_000,
    maxHistorySize: 1000,
    defaultDeviceId: 'esp32-room-01',
  },
};

/** Runtime override via window (useful for docker/env injection) */
declare global {
  interface Window {
    __AIRGUARD_CONFIG__?: Partial<AppConfig>;
  }
}

const env: Environment =
  (import.meta.env.VITE_APP_ENV as Environment) ||
  (import.meta.env.MODE === 'production' ? 'production' : 'development');

export const config: Readonly<AppConfig> = Object.freeze({
  ...defaults[env],
  ...(typeof window !== 'undefined' ? window.__AIRGUARD_CONFIG__ : {}),
});
