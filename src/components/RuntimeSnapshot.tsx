import { useDevice } from '@/context/DeviceContext';
import { Activity, Wind, Gauge, Zap } from 'lucide-react';

function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export function RuntimeSnapshot() {
  const { latest, thresholds, heartbeatAge, status, getEvaluation } = useDevice();
  const evalSnap = getEvaluation();

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Runtime Snapshot
      </h3>
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2"><Wind className="h-3 w-3" /> Active rule</span>
          <span className="font-mono text-foreground text-right max-w-[60%] truncate" title={evalSnap.ruleLabel}>{evalSnap.ruleLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2"><Zap className="h-3 w-3" /> Decision</span>
          <span className="font-mono text-primary text-right max-w-[60%] truncate" title={evalSnap.decision}>{evalSnap.decision}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2"><Gauge className="h-3 w-3" /> Thresholds</span>
          <span className="font-mono text-foreground">
            {thresholds.warningThreshold} / {thresholds.criticalThreshold} ppm
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Hysteresis</span>
          <span className="font-mono text-foreground">±{thresholds.hysteresis} ppm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Heartbeat age</span>
          <span className={`font-mono ${status.deviceOnline ? 'text-success' : 'text-destructive'}`}>
            {formatAge(heartbeatAge)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last reading</span>
          <span className="font-mono text-foreground">
            {new Date(latest.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
