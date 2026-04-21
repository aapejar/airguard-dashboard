import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { mockSettings } from '@/data/mockData';
import { api } from '@/services/api';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import type { SystemSettings } from '@/types/sensor';
import { CheckCircle, Loader2, AlertTriangle, Lock, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ExtendedSettings extends SystemSettings {
  // Connectivity
  requestTimeout: number;
  heartbeatTimeout: number;
  reconnectInterval: number;
  retryAttempts: number;
  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  enforceAdmin2FA: boolean;
  // Notifications
  enableNotifications: boolean;
  alertOnCritical: boolean;
  alertOnDisconnect: boolean;
  // System behavior
  enableHeartbeat: boolean;
  enableAutoRecovery: boolean;
}

const defaultExtended: ExtendedSettings = {
  ...mockSettings,
  requestTimeout: 8,
  heartbeatTimeout: 15,
  reconnectInterval: 5,
  retryAttempts: 3,
  sessionTimeout: 10,
  maxLoginAttempts: 3,
  enforceAdmin2FA: true,
  enableNotifications: true,
  alertOnCritical: true,
  alertOnDisconnect: true,
  enableHeartbeat: true,
  enableAutoRecovery: false,
};

export default function SettingsPage() {
  const { deviceId } = useDevice();
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin');

  const [settings, setSettings] = useState<ExtendedSettings>(defaultExtended);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof ExtendedSettings>(key: K, value: ExtendedSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (settings.refreshInterval < 1 || settings.refreshInterval > 300) errs.refreshInterval = 'Must be 1–300 seconds';
    if (settings.requestTimeout < 1 || settings.requestTimeout > 60) errs.requestTimeout = 'Must be 1–60 seconds';
    if (settings.heartbeatTimeout < 5 || settings.heartbeatTimeout > 300) errs.heartbeatTimeout = 'Must be 5–300 seconds';
    if (settings.reconnectInterval < 1 || settings.reconnectInterval > 60) errs.reconnectInterval = 'Must be 1–60 seconds';
    if (settings.retryAttempts < 0 || settings.retryAttempts > 10) errs.retryAttempts = 'Must be 0–10';
    if (settings.sessionTimeout < 1 || settings.sessionTimeout > 120) errs.sessionTimeout = 'Must be 1–120 minutes';
    if (settings.maxLoginAttempts < 1 || settings.maxLoginAttempts > 10) errs.maxLoginAttempts = 'Must be 1–10';
    if (!settings.deviceName.trim()) errs.deviceName = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await api.updateSettings(deviceId, settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(defaultExtended);
    setErrors({});
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">System configuration and behavior</p>
      </div>

      {!canEdit && (
        <div className="panel p-4 mb-6 flex items-center gap-3 border-warning/30 max-w-xl">
          <Lock className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning">Settings are read-only. Only admins can modify them.</p>
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Device */}
        <Section title="Device Configuration">
          <Field label="Device Name" error={errors.deviceName}>
            <input type="text" value={settings.deviceName} disabled={!canEdit}
              onChange={e => update('deviceName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Location">
            <input type="text" value={settings.location} disabled={!canEdit}
              onChange={e => update('location', e.target.value)} className={inputCls} />
          </Field>
          <Field label="API / Device Endpoint URL">
            <input type="text" value={settings.deviceEndpoint} disabled={!canEdit}
              onChange={e => update('deviceEndpoint', e.target.value)} placeholder="http://192.168.1.100" className={inputCls} />
          </Field>
        </Section>

        {/* Connectivity */}
        <Section title="Connectivity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Polling Interval (s)" error={errors.refreshInterval}>
              <input type="number" value={settings.refreshInterval} disabled={!canEdit}
                onChange={e => update('refreshInterval', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Request Timeout (s)" error={errors.requestTimeout}>
              <input type="number" value={settings.requestTimeout} disabled={!canEdit}
                onChange={e => update('requestTimeout', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Heartbeat Timeout (s)" error={errors.heartbeatTimeout}>
              <input type="number" value={settings.heartbeatTimeout} disabled={!canEdit}
                onChange={e => update('heartbeatTimeout', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Reconnect Retry (s)" error={errors.reconnectInterval}>
              <input type="number" value={settings.reconnectInterval} disabled={!canEdit}
                onChange={e => update('reconnectInterval', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Retry Attempts" error={errors.retryAttempts}>
              <input type="number" value={settings.retryAttempts} disabled={!canEdit}
                onChange={e => update('retryAttempts', Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Session Timeout (min)" error={errors.sessionTimeout}>
              <input type="number" value={settings.sessionTimeout} disabled={!canEdit}
                onChange={e => update('sessionTimeout', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Max Login Attempts" error={errors.maxLoginAttempts}>
              <input type="number" value={settings.maxLoginAttempts} disabled={!canEdit}
                onChange={e => update('maxLoginAttempts', Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <Toggle label="Enforce 2FA for admin accounts"
            desc="Admins must complete TOTP verification on every login."
            checked={settings.enforceAdmin2FA}
            onChange={v => update('enforceAdmin2FA', v)} disabled={!canEdit} />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle label="In-app notifications"
            desc="Show alerts when thresholds are crossed."
            checked={settings.enableNotifications}
            onChange={v => update('enableNotifications', v)} disabled={!canEdit} />
          <Toggle label="Alert on critical CO₂"
            desc="Surface a system alert whenever indoor CO₂ exceeds the critical threshold."
            checked={settings.alertOnCritical}
            onChange={v => update('alertOnCritical', v)} disabled={!canEdit} />
          <Toggle label="Alert on device disconnect"
            desc="Raise a system alert when the device misses heartbeats."
            checked={settings.alertOnDisconnect}
            onChange={v => update('alertOnDisconnect', v)} disabled={!canEdit} />
        </Section>

        {/* System Behavior */}
        <Section title="System Behavior">
          <Toggle label="Heartbeat monitoring"
            desc="Detect device offline by missed heartbeats."
            checked={settings.enableHeartbeat}
            onChange={v => update('enableHeartbeat', v)} disabled={!canEdit} />
          <Toggle label="Auto-recovery (beta)"
            desc="Automatically retry failed commands."
            checked={settings.enableAutoRecovery}
            onChange={v => update('enableAutoRecovery', v)} disabled={!canEdit} />
        </Section>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving || !canEdit}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Settings
          </button>
          <button onClick={handleReset} disabled={!canEdit}
            className="px-4 py-3 bg-muted border border-border text-foreground rounded-md text-sm font-semibold hover:bg-muted/80 disabled:opacity-50 transition-colors flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-4 w-4" />
            Settings saved successfully
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Note: CO₂ thresholds are configured on the <span className="text-foreground font-medium">Control</span> page.
        </p>
      </div>
    </DashboardLayout>
  );
}

const inputCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5 space-y-4">
      <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, disabled }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between bg-muted/40 rounded-md px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
