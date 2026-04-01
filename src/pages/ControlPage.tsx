import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
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
  const { user } = useAuth();
  const { latest, sendCommand, isCommandPending } = useDevice();
  const canControl = user?.role === 'admin' || user?.role === 'operator';

  const [mode, setMode] = useState<'AUTO' | 'MANUAL'>(latest.controlMode);
  const [fanOn, setFanOn] = useState(latest.fanStatus === 'ON');
  const [damperAngle, setDamperAngle] = useState(latest.damperAngle);
  const [showConfirm, setShowConfirm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [cmdError, setCmdError] = useState<string | null>(null);

  const handleApply = async () => {
    setShowConfirm(false);
    setCmdError(null);
    const ok = await sendCommand({
      controlMode: mode,
      fanStatus: fanOn ? 'ON' : 'OFF',
      damperAngle,
    });
    if (ok) {
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } else {
      setCmdError(isCommandPending ? 'Another command is already in progress.' : 'Failed to apply command. Please try again.');
    }
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
            {/* Fan ON/OFF */}
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

            {/* Damper Angle Slider */}
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
      </div>

      {/* Confirmation Dialog */}
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
