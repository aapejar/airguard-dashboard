import { useDevice } from '@/context/DeviceContext';
import { Activity, Wind, Gauge, Zap, Layers, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export function RuntimeSnapshot() {
  const { latest, thresholds, heartbeatAge, status, getEvaluation } = useDevice();
  const evalSnap = getEvaluation();
  if (!latest || !evalSnap) {
    return (
      <div className="panel p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Runtime Snapshot
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Waiting for device data… The supervisory IF-ELSE evaluation will appear once the device reports its first reading.
        </p>
      </div>
    );
  }
  const delta = latest.indoorCO2 - latest.outdoorCO2;
  const deltaOk = delta >= thresholds.minOutdoorDelta;
  const levelTone =
    evalSnap.ventilationLevel === 0 ? 'text-success'
    : evalSnap.ventilationLevel === 1 ? 'text-primary'
    : evalSnap.ventilationLevel === 2 ? 'text-warning'
    : 'text-destructive';

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Runtime Snapshot
      </h3>

      {/* Inputs → Δ → Decision (compact reasoning row) */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Indoor</p>
          <p className="font-mono text-xs font-semibold text-foreground">{latest.indoorCO2} <span className="text-[9px] text-muted-foreground">ppm</span></p>
        </div>
        <div className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outdoor</p>
          <p className="font-mono text-xs font-semibold text-foreground">{latest.outdoorCO2} <span className="text-[9px] text-muted-foreground">ppm</span></p>
        </div>
        <div className={cn('rounded-md px-2 py-1.5 text-center', deltaOk ? 'bg-success/10' : 'bg-warning/10')}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Δ = in − out</p>
          <p className={cn('font-mono text-xs font-semibold', deltaOk ? 'text-success' : 'text-warning')}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(0)} <span className="text-[9px] text-muted-foreground">ppm</span>
          </p>
        </div>
      </div>

      {/* Selected level + active rule */}
      <div className="rounded-md border border-border bg-muted/20 p-2.5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-3 w-3 text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ventilation level</span>
        </div>
        <p className={cn('font-mono text-xs font-semibold truncate', levelTone)} title={evalSnap.ventilationLabel}>
          {evalSnap.ventilationLabel}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate" title={evalSnap.ruleLabel}>
          {evalSnap.ruleLabel}
        </p>
      </div>

      {/* Reasoning + mapped output */}
      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <Zap className="h-3 w-3 text-primary mt-0.5 shrink-0" />
          <p className="text-foreground leading-snug">{evalSnap.decision}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono bg-muted/30 rounded-md px-2 py-1.5">
          <Wind className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Mapped →</span>
          <span className="text-foreground">Fan {evalSnap.recommendation.fanStatus}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-foreground">Damper {evalSnap.recommendedDamperAngle}°</span>
        </div>
      </div>

      {/* Footer: boundaries + heartbeat */}
      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><Gauge className="h-3 w-3" />Boundaries</span>
          <span className="font-mono text-foreground">{thresholds.safeThreshold}/{thresholds.moderateThreshold}/{thresholds.highThreshold}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Min Δ</span>
          <span className="font-mono text-foreground">≥ {thresholds.minOutdoorDelta}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Heartbeat</span>
          <span className={cn('font-mono', status?.deviceOnline ? 'text-success' : 'text-destructive')}>
            {formatAge(heartbeatAge)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last reading</span>
          <span className="font-mono text-foreground">{new Date(latest.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
