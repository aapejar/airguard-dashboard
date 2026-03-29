import type { AlertItem } from '@/types/sensor';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AlertsPanelProps {
  alerts: AlertItem[];
}

const iconMap = {
  normal: CheckCircle,
  warning: AlertTriangle,
  critical: XCircle,
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Recent Alerts</h3>
      <div className="space-y-3">
        {alerts.map(alert => {
          const Icon = iconMap[alert.level];
          return (
            <div key={alert.id} className="flex items-start gap-3 text-sm">
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', {
                'text-success': alert.level === 'normal',
                'text-warning': alert.level === 'warning',
                'text-destructive': alert.level === 'critical',
              })} />
              <div className="min-w-0 flex-1">
                <p className="text-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
