import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensorCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: 'normal' | 'warning' | 'critical';
  subtitle?: string;
}

export function SensorCard({ label, value, unit, icon: Icon, status, subtitle }: SensorCardProps) {
  return (
    <div className="sensor-card group">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {status && (
          <span className={cn('status-badge', {
            'status-normal': status === 'normal',
            'status-warning': status === 'warning',
            'status-critical': status === 'critical',
          })}>
            {status}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="sensor-value text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground font-mono">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
