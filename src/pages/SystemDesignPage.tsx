import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, Cpu, Wifi, BarChart3, Settings2, ShieldCheck, RefreshCw, Database, Monitor, Zap } from 'lucide-react';

const flowSteps = [
  { icon: Cpu, title: 'System Initialization', desc: 'ESP32 boots, connects to WiFi, initializes sensors (MH-Z19B)' },
  { icon: BarChart3, title: 'Sensor Reading', desc: 'Read indoor CO₂ and outdoor CO₂ values from sensors' },
  { icon: ShieldCheck, title: 'Data Validation', desc: 'Check sensor values are within expected range (0–5000 ppm)' },
  { icon: Settings2, title: 'Data Processing', desc: 'Compare indoor CO₂ vs outdoor CO₂, determine air quality state' },
  { icon: ArrowRight, title: 'Control Decision', desc: 'Apply on-off control logic based on configurable thresholds' },
  { icon: Wifi, title: 'Send to Server', desc: 'HTTP POST sensor data and status to web dashboard API' },
  { icon: RefreshCw, title: 'Loop', desc: 'Wait for refresh interval, then repeat the cycle' },
];

export default function SystemDesignPage() {
  const { thresholds, latest, getEvaluation } = useDevice();
  const { warningThreshold: warn, criticalThreshold: crit, hysteresis } = thresholds;
  const evalSnap = getEvaluation();

  const controlRules = [
    {
      condition: `Indoor CO₂ < ${warn} ppm`,
      action: 'Fan OFF · Damper Closed',
      color: 'border-success/40 bg-success/5',
      dot: 'bg-success',
      note: 'Air quality is acceptable',
    },
    {
      condition: `${warn} ≤ Indoor CO₂ ≤ ${crit} ppm`,
      action: 'Maintain Previous State',
      color: 'border-warning/40 bg-warning/5',
      dot: 'bg-warning',
      note: `Dead-band zone (±${hysteresis} ppm) — prevents oscillation`,
    },
    {
      condition: `Indoor CO₂ > ${crit} ppm AND Outdoor < Indoor`,
      action: 'Fan ON · Damper Open',
      color: 'border-destructive/40 bg-destructive/5',
      dot: 'bg-destructive',
      note: 'Outdoor air is cleaner — ventilate',
    },
    {
      condition: `Indoor CO₂ > ${crit} ppm AND Outdoor ≥ Indoor`,
      action: 'Fan OFF · Damper Closed',
      color: 'border-primary/40 bg-primary/5',
      dot: 'bg-primary',
      note: 'Outdoor air is worse — protect indoor',
    },
  ];

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
              Hysteresis-based on-off control with dead-band to prevent relay chatter. Thresholds are configurable from the Control page and update live.
            </p>

            <div className="space-y-3">
              {controlRules.map((rule, i) => (
                <div key={i} className={cn('p-4 rounded-lg border transition-colors', rule.color)}>
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

          {/* Threshold Summary (live) */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Threshold Parameters (Live)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Warning</p>
                <p className="text-2xl font-bold font-mono text-warning">{warn}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Critical</p>
                <p className="text-2xl font-bold font-mono text-destructive">{crit}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Hysteresis</p>
                <p className="text-2xl font-bold font-mono text-primary">{hysteresis}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
            </div>
          </div>

          {/* Current Evaluation Snapshot */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Current Evaluation Snapshot
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Indoor CO₂</p>
                  <p className="font-mono font-semibold text-foreground">{latest.indoorCO2} ppm</p>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Outdoor CO₂</p>
                  <p className="font-mono font-semibold text-foreground">{latest.outdoorCO2} ppm</p>
                </div>
              </div>
              <div className="border-l-2 border-primary pl-3 py-1">
                <p className="text-xs text-muted-foreground">Active rule</p>
                <p className="font-mono text-foreground">{evalSnap.ruleLabel}</p>
              </div>
              <div className="border-l-2 border-success pl-3 py-1">
                <p className="text-xs text-muted-foreground">Decision</p>
                <p className="text-foreground">{evalSnap.decision}</p>
              </div>
              <div className="border-l-2 border-warning pl-3 py-1">
                <p className="text-xs text-muted-foreground">Recommended action</p>
                <p className="font-mono text-foreground">
                  Fan {evalSnap.recommendation.fanStatus} · Damper {evalSnap.recommendation.damperAction}
                </p>
              </div>
              <p className="text-xs text-muted-foreground italic">{evalSnap.notes}</p>
            </div>
          </div>

          {/* Data Flow */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Data Flow</h3>
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex-1 text-center bg-muted/30 rounded-md p-3">
                <Cpu className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground">ESP32</p>
                <p className="text-muted-foreground text-[10px]">MH-Z19B sensor</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-muted/30 rounded-md p-3">
                <Database className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground">Backend API</p>
                <p className="text-muted-foreground text-[10px]">Node / Express</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-muted/30 rounded-md p-3">
                <Monitor className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground">Dashboard</p>
                <p className="text-muted-foreground text-[10px]">React SPA</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              Device pushes readings + heartbeats to the backend. Dashboard polls{' '}
              <span className="font-mono text-foreground">/api/devices/:id/readings/latest</span> every few seconds and dispatches control commands via{' '}
              <span className="font-mono text-foreground">/api/devices/:id/control</span>, which the ESP32 polls and applies.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
