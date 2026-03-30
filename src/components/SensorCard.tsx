import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SensorCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: 'normal' | 'warning' | 'critical';
  subtitle?: string;
  highlight?: boolean;
}

export function SensorCard({ label, value, unit, icon: Icon, status, subtitle, highlight }: SensorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'sensor-card group relative overflow-hidden',
        highlight && 'ring-1 ring-primary/40 border-primary/30'
      )}
    >
      {highlight && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'p-2 rounded-md transition-colors',
          highlight ? 'bg-primary/20' : 'bg-primary/10'
        )}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {status && (
          <span className={cn('status-badge', {
            'status-normal': status === 'normal',
            'status-warning': status === 'warning',
            'status-critical': status === 'critical',
          })}>
            <span className={cn('h-1.5 w-1.5 rounded-full inline-block', {
              'bg-success': status === 'normal',
              'bg-warning': status === 'warning',
              'bg-destructive': status === 'critical',
            })} />
            {status}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn('sensor-value', highlight ? 'text-primary' : 'text-foreground')}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground font-mono">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
    </motion.div>
  );
}
