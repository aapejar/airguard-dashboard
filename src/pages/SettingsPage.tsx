import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { mockSettings } from '@/data/mockData';
import { api } from '@/services/api';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import type { SystemSettings } from '@/types/sensor';
import { CheckCircle, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ExtendedSettings extends SystemSettings {
  requestTimeout: number;
  enableHeartbeat: boolean;
  enableNotifications: boolean;
  enableAutoRecovery: boolean;
}

const defaultExtended: ExtendedSettings = {
  ...mockSettings,
  requestTimeout: 8,
  enableHeartbeat: true,
  enableNotifications: true,
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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">System configuration</p>
      </div>

      {!canEdit && (
        <div className="panel p-4 mb-6 flex items-center gap-3 border-warning/30 max-w-xl">
          <Lock className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning">Settings are read-only. Only admins can modify them.</p>
        </div>
      )}

      <div className="max-w-xl space-y-6">
        {/* Device */}
        <div className="panel p-5 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Device Configuration</h3>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Device Name</label>
            <input
              type="text"
              value={settings.deviceName}
              disabled={!canEdit}
              onChange={e => update('deviceName', e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            />
            {errors.deviceName && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.deviceName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Location</label>
            <input
              type="text"
              value={settings.location}
              disabled={!canEdit}
              onChange={e => update('location', e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">API / Device Endpoint URL</label>
            <input
              type="text"
              value={settings.deviceEndpoint}
              disabled={!canEdit}
              onChange={e => update('deviceEndpoint', e.target.value)}
              placeholder="http://192.168.1.100"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* System / Network */}
        <div className="panel p-5 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">System & Network</h3>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Polling Interval (seconds)</label>
            <input
              type="number"
              value={settings.refreshInterval}
              disabled={!canEdit}
              onChange={e => update('refreshInterval', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            />
            {errors.refreshInterval && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.refreshInterval}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Request Timeout (seconds)</label>
            <input
              type="number"
              value={settings.requestTimeout}
              disabled={!canEdit}
              onChange={e => update('requestTimeout', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
            />
            {errors.requestTimeout && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.requestTimeout}
              </p>
            )}
          </div>
        </div>

        {/* Feature toggles */}
        <div className="panel p-5 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Feature Toggles</h3>

          {[
            { key: 'enableHeartbeat', label: 'Heartbeat monitoring', desc: 'Detect device offline by missed heartbeats' },
            { key: 'enableNotifications', label: 'In-app notifications', desc: 'Show alerts when thresholds are crossed' },
            { key: 'enableAutoRecovery', label: 'Auto-recovery (beta)', desc: 'Automatically retry failed commands' },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between bg-muted/40 rounded-md px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
              <Switch
                checked={settings[f.key as keyof ExtendedSettings] as boolean}
                disabled={!canEdit}
                onCheckedChange={v => update(f.key as keyof ExtendedSettings, v as never)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="w-full py-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
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
