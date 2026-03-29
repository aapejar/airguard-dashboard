import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { mockSettings } from '@/data/mockData';
import { api } from '@/services/api';
import type { SystemSettings } from '@/types/sensor';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({ ...mockSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof SystemSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await api.updateSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields: { key: keyof SystemSettings; label: string; type: 'number' | 'text'; unit?: string }[] = [
    { key: 'co2WarningThreshold', label: 'CO₂ Warning Threshold', type: 'number', unit: 'ppm' },
    { key: 'co2CriticalThreshold', label: 'CO₂ Critical Threshold', type: 'number', unit: 'ppm' },
    { key: 'refreshInterval', label: 'Refresh Interval', type: 'number', unit: 'seconds' },
    { key: 'deviceName', label: 'Device Name', type: 'text' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'deviceEndpoint', label: 'Device Endpoint URL', type: 'text', unit: 'http://...' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">System configuration</p>
      </div>

      <div className="max-w-xl panel p-5 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
              {f.label} {f.unit && <span className="normal-case">({f.unit})</span>}
            </label>
            <input
              type={f.type}
              value={settings[f.key]}
              onChange={e => update(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        ))}

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Settings
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-sm text-success mt-3">
              <CheckCircle className="h-4 w-4" />
              Settings saved successfully
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
