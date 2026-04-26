import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, Cpu, Wifi, BarChart3, Settings2, ShieldCheck, RefreshCw, Database, Monitor, Zap, Layers } from 'lucide-react';

const flowSteps = [
  { icon: Cpu, title: 'System Initialization', desc: 'ESP32 boots, connects to WiFi, initializes sensors (MH-Z19B)' },
  { icon: BarChart3, title: 'Read Sensors', desc: 'Sample indoor & outdoor CO₂ values from MH-Z19B sensors' },
  { icon: ShieldCheck, title: 'Validate Data', desc: 'Reject readings outside the expected sensor range (0–5000 ppm)' },
  { icon: Layers, title: 'Evaluate Conditions (IF-ELSE)', desc: 'Higher-level supervisory layer evaluates indoor CO₂, outdoor CO₂ and Δ' },
  { icon: Settings2, title: 'Determine Ventilation Level', desc: 'Select Level 0–3 from the rule base (Closed / Light / Medium / Aggressive)' },
  { icon: ArrowRight, title: 'Map Level → Actuator Targets', desc: 'Translate the chosen level into damper angle and fan state' },
  { icon: Cpu, title: 'Execute Outputs', desc: 'Drive damper servo and fan relay; respect MANUAL overrides if active' },
  { icon: Wifi, title: 'Publish State', desc: 'POST sensor + decision + actuator state to backend API' },
  { icon: RefreshCw, title: 'Loop', desc: 'Wait for refresh interval, then repeat the supervisory cycle' },
];

export default function SystemDesignPage() {
  const { thresholds, latest, getEvaluation } = useDevice();
  const { safeThreshold: safe, moderateThreshold: mod, highThreshold: high, minOutdoorDelta: dmin, hysteresis } = thresholds;
  const evalSnap = getEvaluation();

  const controlRules = [
    {
      level: 'Level 0',
      condition: `IF indoor < ${safe} ppm`,
      action: 'Fan OFF · Damper 0° (Closed)',
      color: 'border-success/40 bg-success/5',
      dot: 'bg-success',
      note: 'Closed / Safe — no ventilation needed.',
    },
    {
      level: 'Level 1',
      condition: `ELSE IF indoor < ${mod} ppm AND (indoor − outdoor) ≥ ${dmin} ppm`,
      action: 'Fan OFF · Damper 30°',
      color: 'border-primary/40 bg-primary/5',
      dot: 'bg-primary',
      note: 'Light Ventilation — passive intake only.',
    },
    {
      level: 'Level 2',
      condition: `ELSE IF indoor < ${high} ppm AND (indoor − outdoor) ≥ ${dmin} ppm`,
      action: 'Fan ON · Damper 60°',
      color: 'border-warning/40 bg-warning/5',
      dot: 'bg-warning',
      note: 'Medium Ventilation — active exhaust engaged.',
    },
    {
      level: 'Level 3',
      condition: `ELSE indoor ≥ ${high} ppm AND (indoor − outdoor) ≥ ${dmin} ppm`,
      action: 'Fan ON · Damper 90° (Full Open)',
      color: 'border-destructive/40 bg-destructive/5',
      dot: 'bg-destructive',
      note: 'Aggressive Ventilation — highest supervisory level.',
    },
    {
      level: 'Override',
      condition: `IF indoor ≥ ${safe} AND (indoor − outdoor) < ${dmin} ppm`,
      action: 'Force Level 0 (Sealed)',
      color: 'border-muted bg-muted/20',
      dot: 'bg-muted-foreground',
      note: 'Outdoor air is not advantageous — supervisor blocks ventilation.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">System Design</h2>
        <p className="text-xs text-muted-foreground mt-0.5">IF-ELSE supervisory control architecture &amp; rule base documentation</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Software Flow */}
        <div className="panel p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">Supervisory Control Flow</h3>
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
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">IF-ELSE Rule Base (Supervisory Layer)</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              The supervisor evaluates sensor inputs against a structured IF-ELSE rule base to choose a discrete <span className="font-semibold text-foreground">ventilation level (0–3)</span>. The selected level is then mapped into actuator targets (damper angle &amp; fan state) by the output mapping layer. A small stabilization band (±{hysteresis} ppm) only smooths transitions between levels.
            </p>

            <div className="space-y-3">
              {controlRules.map((rule, i) => (
                <div key={i} className={cn('p-4 rounded-lg border transition-colors', rule.color)}>
                  <div className="flex items-start gap-3">
                    <span className={cn('h-2.5 w-2.5 rounded-full mt-1 shrink-0', rule.dot)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{rule.level}</span>
                      </div>
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
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Decision Boundaries (Live)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Safe</p>
                <p className="text-2xl font-bold font-mono text-success">{safe}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Moderate</p>
                <p className="text-2xl font-bold font-mono text-primary">{mod}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">High</p>
                <p className="text-2xl font-bold font-mono text-destructive">{high}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Min outdoor Δ</p>
                <p className="text-2xl font-bold font-mono text-warning">{dmin}</p>
                <p className="text-xs text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stabilization band</p>
                <p className="text-2xl font-bold font-mono text-muted-foreground">±{hysteresis}</p>
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
                <p className="text-xs text-muted-foreground">Selected ventilation level</p>
                <p className="font-mono text-foreground font-semibold">{evalSnap.ventilationLabel}</p>
              </div>
              <div className="border-l-2 border-primary pl-3 py-1">
                <p className="text-xs text-muted-foreground">Active rule</p>
                <p className="font-mono text-foreground">{evalSnap.ruleLabel}</p>
              </div>
              <div className="border-l-2 border-success pl-3 py-1">
                <p className="text-xs text-muted-foreground">Decision (reasoning)</p>
                <p className="text-foreground">{evalSnap.decision}</p>
              </div>
              <div className="border-l-2 border-warning pl-3 py-1">
                <p className="text-xs text-muted-foreground">Mapped actuator targets</p>
                <p className="font-mono text-foreground">
                  Fan {evalSnap.recommendation.fanStatus} · Damper {evalSnap.recommendedDamperAngle}° ({evalSnap.recommendation.damperAction})
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
                <p className="text-muted-foreground text-[10px]">Sensors + supervisor</p>
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
              Device pushes readings, the chosen ventilation level, and heartbeats to the backend. Dashboard polls{' '}
              <span className="font-mono text-foreground">/api/devices/:id/readings/latest</span> every few seconds and dispatches control commands via{' '}
              <span className="font-mono text-foreground">/api/devices/:id/control</span>, which the ESP32 polls and applies.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
