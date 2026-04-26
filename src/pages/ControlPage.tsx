import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Loader2, ShieldCheck, SlidersHorizontal, History, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ControlPage() {
  const { hasRole, user } = useAuth();
  const { latest, sendCommand, isCommandPending, thresholds, updateThresholds, resetThresholds, commandHistory } = useDevice();
  const canControl = hasRole('admin', 'operator');
  const canConfigureThresholds = hasRole('admin', 'operator');

  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>(latest.controlMode);
  const [fanOn, setFanOn] = useState(latest.fanStatus === 'ON');
  const [damperAngle, setDamperAngle] = useState(latest.damperAngle);
  const [showConfirm, setShowConfirm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [cmdError, setCmdError] = useState<string | null>(null);

  // Decision-boundary form state (supervisory IF-ELSE control)
  const [safe, setSafe] = useState(thresholds.safeThreshold);
  const [moderate, setModerate] = useState(thresholds.moderateThreshold);
  const [high, setHigh] = useState(thresholds.highThreshold);
  const [delta, setDelta] = useState(thresholds.minOutdoorDelta);
  const [hyst, setHyst] = useState(thresholds.hysteresis);
  const [thrSaved, setThrSaved] = useState(false);
  const [thrError, setThrError] = useState<string | null>(null);

  const handleApply = async () => {
    setShowConfirm(false);
    setCmdError(null);
    const ok = await sendCommand({ controlMode: mode, fanStatus: fanOn ? 'ON' : 'OFF', damperAngle }, user?.username);
    if (ok) {
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } else {
      setCmdError(isCommandPending ? 'Another command is already in progress.' : 'Failed to apply command.');
    }
  };

  const handleSaveThresholds = () => {
    setThrError(null);
    if (safe < 300 || safe > 5000) return setThrError('Safe boundary must be between 300 and 5000 ppm');
    if (moderate < 400 || moderate > 5000) return setThrError('Moderate boundary must be between 400 and 5000 ppm');
    if (high < 500 || high > 5000) return setThrError('High boundary must be between 500 and 5000 ppm');
    if (!(safe < moderate && moderate < high)) return setThrError('Boundaries must satisfy safe < moderate < high');
    if (delta < 0 || delta > 1000) return setThrError('Min outdoor Δ must be 0–1000 ppm');
    if (hyst < 0 || hyst > 500) return setThrError('Stabilization band must be 0–500 ppm');
    updateThresholds(
      {
        safeThreshold: safe,
        moderateThreshold: moderate,
        highThreshold: high,
        minOutdoorDelta: delta,
        hysteresis: hyst,
      },
      user?.username,
    );
    setThrSaved(true);
    setTimeout(() => setThrSaved(false), 3000);
  };

  const isBusy = isCommandPending;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Control Panel</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Ventilation system control</p>
      </div>

      {!canControl && (
        <div className="panel p-4 mb-6 flex items-center gap-3 border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning">You need operator or admin role to modify controls.</p>
        </div>
      )}

      <div className="max-w-xl space-y-6">
        {/* Current Status */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Active Command Status</label>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Mode</p>
              <p className="font-mono font-semibold text-foreground">{latest.controlMode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Fan</p>
              <p className={cn('font-mono font-semibold', latest.fanStatus === 'ON' ? 'text-success' : 'text-muted-foreground')}>
                {latest.fanStatus}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Damper</p>
              <p className="font-mono font-semibold text-foreground">{latest.damperAngle}°</p>
            </div>
          </div>
        </div>

        {/* Supervisory Decision Boundaries (IF-ELSE rule layer) */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Supervisory Decision Boundaries</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            These values configure the IF-ELSE supervisory layer that selects a ventilation level (0–3) before any actuator action. Updates apply immediately and are mirrored on the System Design page.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Safe ≤ (ppm)</label>
              <input
                type="number"
                value={safe}
                onChange={e => setSafe(Number(e.target.value))}
                disabled={!canConfigureThresholds}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Moderate ≤ (ppm)</label>
              <input
                type="number"
                value={moderate}
                onChange={e => setModerate(Number(e.target.value))}
                disabled={!canConfigureThresholds}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">High ≤ (ppm)</label>
              <input
                type="number"
                value={high}
                onChange={e => setHigh(Number(e.target.value))}
                disabled={!canConfigureThresholds}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Min outdoor Δ (ppm)</label>
              <input
                type="number"
                value={delta}
                onChange={e => setDelta(Number(e.target.value))}
                disabled={!canConfigureThresholds}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Required (indoor − outdoor) to authorise ventilation.</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Stabilization band ± (ppm)</label>
              <input
                type="number"
                value={hyst}
                onChange={e => setHyst(Number(e.target.value))}
                disabled={!canConfigureThresholds}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Smooths transitions between levels (supporting role only).</p>
            </div>
          </div>

          {thrError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />{thrError}
            </p>
          )}

          <button
            onClick={handleSaveThresholds}
            disabled={!canConfigureThresholds}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Save Decision Boundaries
          </button>
          <button
            type="button"
            onClick={() => {
              resetThresholds(user?.username);
              setSafe(700); setModerate(900); setHigh(1100); setDelta(50); setHyst(50);
              setThrSaved(true);
              setTimeout(() => setThrSaved(false), 3000);
            }}
            disabled={!canConfigureThresholds}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Restore default boundaries
          </button>
          {thrSaved && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              Decision boundaries saved
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="panel p-5">
          <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-3">Control Mode</label>
          <div className="flex gap-2">
            {(['AUTO', 'MANUAL'] as const).map(m => (
              <button
                key={m}
                onClick={() => canControl && setMode(m)}
                disabled={!canControl}
                className={cn(
                  'flex-1 py-3.5 rounded-md text-sm font-semibold transition-all border',
                  mode === m
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:border-primary/30',
                  !canControl && 'opacity-50 cursor-not-allowed'
                )}
              >
                {m === 'AUTO' ? '⚙ AUTO' : '✋ MANUAL'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {mode === 'AUTO' ? 'System regulates automatically based on CO₂ levels.' : 'Manual override enabled — you control fan and damper directly.'}
          </p>
        </div>

        {/* Manual Controls */}
        {mode === 'MANUAL' && (
          <div className="panel p-5 space-y-6">
            <div>
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-3">Fan Control</label>
              <div className="flex items-center justify-between bg-muted rounded-md px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Fan is <span className={fanOn ? 'text-success' : 'text-destructive'}>{fanOn ? 'ON' : 'OFF'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fanOn ? 'Exhaust fan is running' : 'Exhaust fan is stopped'}
                  </p>
                </div>
                <Switch checked={fanOn} onCheckedChange={setFanOn} disabled={!canControl} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Damper Angle</label>
                <span className="text-sm font-mono font-semibold text-foreground">{damperAngle}°</span>
              </div>
              <Slider
                value={[damperAngle]}
                onValueChange={([v]) => setDamperAngle(v)}
                min={0}
                max={90}
                step={1}
                disabled={!canControl}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5 font-mono">
                <span>0° Closed</span>
                <span>45° Half</span>
                <span>90° Open</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canControl || isBusy}
              className="w-full py-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isBusy ? 'Applying…' : 'Apply Manual Override'}
            </button>

            {applied && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Command applied successfully
              </div>
            )}
            {cmdError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {cmdError}
              </div>
            )}
          </div>
        )}

        {/* Command History */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recent Commands</h3>
          </div>
          {commandHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No commands sent yet.</p>
          ) : (
            <div className="space-y-2">
              {commandHistory.slice(0, 6).map(rec => (
                <div key={rec.id} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 text-xs font-mono">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">
                      {rec.command.controlMode} · Fan {rec.command.fanStatus} · Damper {rec.command.damperAngle}°
                    </p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {new Date(rec.timestamp).toLocaleTimeString()}{rec.actor ? ` · ${rec.actor}` : ''}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] uppercase font-semibold px-2 py-0.5 rounded shrink-0',
                    rec.result === 'success' && 'bg-success/15 text-success',
                    rec.result === 'pending' && 'bg-warning/15 text-warning',
                    rec.result === 'failed' && 'bg-destructive/15 text-destructive',
                  )}>
                    {rec.result}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Manual Override</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are about to set Fan to <span className="font-mono text-foreground font-semibold">{fanOn ? 'ON' : 'OFF'}</span> and
              Damper Angle to <span className="font-mono text-foreground font-semibold">{damperAngle}°</span>.
              This will override automatic control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} className="bg-primary text-primary-foreground hover:opacity-90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
