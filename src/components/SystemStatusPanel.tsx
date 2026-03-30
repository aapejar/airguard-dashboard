import type { SystemStatus } from '@/types/sensor';
import { cn } from '@/lib/utils';
import { Wifi, Clock, Activity, Server } from 'lucide-react';

interface SystemStatusPanelProps {
  status: SystemStatus;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function SystemStatusPanel({ status }: SystemStatusPanelProps) {
  const signalStrength = status.wifiSignal > -50 ? 'Strong' : status.wifiSignal > -70 ? 'Good' : 'Weak';
  const signalColor = status.wifiSignal > -50 ? 'text-success' : status.wifiSignal > -70 ? 'text-warning' : 'text-destructive';

  const items = [
    {
      icon: Server,
      label: 'Device Status',
      value: status.deviceOnline ? 'Online' : 'Offline',
      valueClass: status.deviceOnline ? 'text-success' : 'text-destructive',
      dot: true,
      dotClass: status.deviceOnline ? 'bg-success' : 'bg-destructive',
    },
    {
      icon: Clock,
      label: 'Last Update',
      value: formatTimeAgo(status.lastHeartbeat),
      valueClass: 'text-foreground',
    },
    {
      icon: Wifi,
      label: 'Signal',
      value: `${signalStrength} (${status.wifiSignal} dBm)`,
      valueClass: signalColor,
    },
    {
      icon: Activity,
      label: 'Uptime',
      value: formatUptime(status.uptime),
      valueClass: 'text-foreground',
    },
  ];

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">System Status</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </div>
            <div className={cn('font-mono text-xs flex items-center gap-1.5', item.valueClass)}>
              {item.dot && (
                <span className={cn('h-2 w-2 rounded-full animate-pulse-glow', item.dotClass)} />
              )}
              {item.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono">{status.firmwareVersion}</p>
      </div>
    </div>
  );
}
