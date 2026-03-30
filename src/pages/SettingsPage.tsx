import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { mockSettings } from '@/data/mockData';
import { api } from '@/services/api';
import type { SystemSettings } from '@/types/sensor';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({ ...mockSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof SystemSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (settings.co2WarningThreshold >= settings.co2CriticalThreshold) {
      errs.co2WarningThreshold = 'Warning must be less than critical threshold';
    }
    if (settings.co2WarningThreshold < 200) errs.co2WarningThreshold = 'Must be at least 200 ppm';
    if (settings.co2CriticalThreshold < 400) errs.co2CriticalThreshold = 'Must be at least 400 ppm';
    if (settings.refreshInterval < 1 || settings.refreshInterval > 300) errs.refreshInterval = 'Must be 1–300 seconds';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await api.updateSettings(settings);
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

      <div className="max-w-xl space-y-6">
        {/* Thresholds */}
        <div className="panel p-5 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">CO₂ Thresholds</h3>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Warning Threshold (ppm)</label>
            <input
              type="number"
              value={settings.co2WarningThreshold}
              onChange={e => update('co2WarningThreshold', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            {errors.co2WarningThreshold && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.co2WarningThreshold}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Critical Threshold (ppm)</label>
            <input
              type="number"
              value={settings.co2CriticalThreshold}
              onChange={e => update('co2CriticalThreshold', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            {errors.co2CriticalThreshold && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.co2CriticalThreshold}
              </p>
            )}
          </div>
        </div>

        {/* System */}
        <div className="panel p-5 space-y-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">System</h3>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Refresh Interval (seconds)</label>
            <input
              type="number"
              value={settings.refreshInterval}
              onChange={e => update('refreshInterval', Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            {errors.refreshInterval && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{errors.refreshInterval}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Device Name</label>
            <input
              type="text"
              value={settings.deviceName}
              onChange={e => update('deviceName', e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Location</label>
            <input
              type="text"
              value={settings.location}
              onChange={e => update('location', e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Device Endpoint URL</label>
            <input
              type="text"
              value={settings.deviceEndpoint}
              onChange={e => update('deviceEndpoint', e.target.value)}
              placeholder="http://192.168.1.100"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
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
      </div>
    </DashboardLayout>
  );
}
