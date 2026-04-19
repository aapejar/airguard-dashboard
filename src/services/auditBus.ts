/**
 * Lightweight pub/sub for cross-context audit events.
 *
 * AuthContext lives above DeviceProvider, so it can't call useDevice(). Instead
 * it publishes auth events here and DeviceContext subscribes on mount, mirroring
 * the entries into the unified audit log shown in the UI.
 */

import type { AlertItem, AlertSource } from '@/types/sensor';

export interface AuditEvent {
  level: AlertItem['level'];
  message: string;
  source: AlertSource;
  actor?: string;
}

type Listener = (e: AuditEvent) => void;

const listeners = new Set<Listener>();

export const auditBus = {
  emit(event: AuditEvent) {
    listeners.forEach(l => {
      try { l(event); } catch (err) { console.error('[auditBus] listener error', err); }
    });
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
