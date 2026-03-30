import { DashboardLayout } from '@/components/DashboardLayout';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, Cpu, Wifi, BarChart3, Settings2, ShieldCheck, RefreshCw } from 'lucide-react';

const flowSteps = [
  { icon: Cpu, title: 'System Initialization', desc: 'ESP32 boots, connects to WiFi, initializes sensors (MH-Z19B)' },
  { icon: BarChart3, title: 'Sensor Reading', desc: 'Read indoor CO₂ and outdoor CO₂ values from sensors' },
  { icon: ShieldCheck, title: 'Data Validation', desc: 'Check sensor values are within expected range (0–5000 ppm)' },
  { icon: Settings2, title: 'Data Processing', desc: 'Compare indoor CO₂ vs outdoor CO₂, determine air quality state' },
  { icon: ArrowRight, title: 'Control Decision', desc: 'Apply on-off control logic based on thresholds (900/1000 ppm)' },
  { icon: Wifi, title: 'Send to Server', desc: 'HTTP POST sensor data and status to web dashboard API' },
  { icon: RefreshCw, title: 'Loop', desc: 'Wait for refresh interval, then repeat the cycle' },
];

const controlRules = [
  {
    condition: 'Indoor CO₂ < 900 ppm',
    action: 'Fan OFF · Damper Closed',
    color: 'border-success/40 bg-success/5',
    dot: 'bg-success',
    note: 'Air quality is acceptable',
  },
  {
    condition: '900 ≤ Indoor CO₂ ≤ 1000 ppm',
    action: 'Maintain Previous State',
    color: 'border-warning/40 bg-warning/5',
    dot: 'bg-warning',
    note: 'Dead-band zone — prevents oscillation',
  },
  {
    condition: 'Indoor CO₂ > 1000 ppm AND Outdoor < Indoor',
    action: 'Fan ON · Damper Open',
    color: 'border-destructive/40 bg-destructive/5',
    dot: 'bg-destructive',
    note: 'Outdoor air is cleaner — ventilate',
  },
  {
    condition: 'Indoor CO₂ > 1000 ppm AND Outdoor ≥ Indoor',
    action: 'Fan OFF · Damper Closed',
    color: 'border-primary/40 bg-primary/5',
    dot: 'bg-primary',
    note: 'Outdoor air is worse — protect indoor',
  },
];

export default function SystemDesignPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">System Design</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Software architecture and control logic documentation</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Software Flow */}
        <div className="panel p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Software Flow</h3>
          <div className="space-y-1">
            {flowSteps.map((step, i) => (
              <div key={step.title}>
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                      <step.icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="flex justify-start ml-[22px]">
                    <ArrowDown className="h-4 w-4 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Control Logic */}
        <div className="space-y-6">
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">On-Off Control Logic</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Hysteresis-based on-off control with dead-band to prevent relay chatter. The system compares indoor and outdoor CO₂ levels before deciding to ventilate.
            </p>

            <div className="space-y-3">
              {controlRules.map((rule, i) => (
                <div
                  key={i}
                  className={cn('p-4 rounded-lg border transition-colors', rule.color)}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn('h-2.5 w-2.5 rounded-full mt-1 shrink-0', rule.dot)} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground font-mono">{rule.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">→ {rule.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{rule.note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threshold Summary */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Threshold Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lower Threshold</p>
                <p className="text-2xl font-bold font-mono text-warning">900</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Upper Threshold</p>
                <p className="text-2xl font-bold font-mono text-destructive">1000</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
