import type { AlertItem } from '@/types/sensor';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, XCircle, Trash2 } from 'lucide-react';

interface AlertsPanelProps {
  alerts: AlertItem[];
  onClear?: () => void;
}

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  critical: XCircle,
};

const levelColors = {
  info: 'border-l-primary text-primary',
  warning: 'border-l-warning text-warning',
  critical: 'border-l-destructive text-destructive',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AlertsPanel({ alerts, onClear }: AlertsPanelProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">System Alerts</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{alerts.length} events</span>
          {onClear && alerts.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title="Clear all alerts"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No system alerts — all clear.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const Icon = iconMap[alert.level];
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 text-sm p-2.5 rounded-md bg-muted/30 border-l-2 transition-colors hover:bg-muted/50',
                  levelColors[alert.level]
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-xs leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatTimestamp(alert.timestamp)}
                    {alert.actor && <span> · by {alert.actor}</span>}
                    {alert.source && alert.source !== 'system' && <span> · {alert.source}</span>}
                  </p>
                </div>
                <span className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                  alert.level === 'info' && 'bg-primary/10 text-primary',
                  alert.level === 'warning' && 'bg-warning/10 text-warning',
                  alert.level === 'critical' && 'bg-destructive/10 text-destructive',
                )}>
                  {alert.level}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
