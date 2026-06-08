import { Loader2, AlertOctagon, RadioTower } from 'lucide-react';

interface Props {
  title?: string;
  message?: string;
  error?: string | null;
  variant?: 'waiting' | 'error';
}

export function EmptyDeviceState({
  title = 'Waiting for device data…',
  message = 'No telemetry has been received from the device yet. Once the ESP32 starts reporting, live values will appear here.',
  error,
  variant = 'waiting',
}: Props) {
  const isError = variant === 'error' || !!error;
  const Icon = isError ? AlertOctagon : RadioTower;
  return (
    <div className="panel p-6 flex items-start gap-4">
      <div className="shrink-0">
        <div className="relative">
          <Icon className={isError ? 'h-6 w-6 text-destructive' : 'h-6 w-6 text-primary'} />
          {!isError && <Loader2 className="h-3 w-3 text-primary absolute -bottom-1 -right-1 animate-spin" />}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{message}</p>
        {error && <p className="text-[11px] text-destructive mt-2 font-mono">{error}</p>}
      </div>
    </div>
  );
}
