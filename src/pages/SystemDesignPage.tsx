import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, Cpu, Wifi, BarChart3, Settings2, ShieldCheck, RefreshCw, Database, Monitor, Zap, Layers, Info, Ban } from 'lucide-react';

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
  const delta = latest ? latest.indoorCO2 - latest.outdoorCO2 : 0;
  const deltaOk = delta >= dmin;
  const blocked = evalSnap.rule === 'level-blocked-outdoor-worse';

  const controlRules: Array<{
    id: string;
    level: string;
    interval: string;
    gate: string;
    action: string;
    color: string;
    dot: string;
    note: string;
  }> = [
    {
      id: 'level-0-safe',
      level: 'Level 0',
      interval: `indoor < ${safe} ppm`,
      gate: '—',
      action: 'Fan OFF · Damper 0° (Closed)',
      color: 'border-success/40 bg-success/5',
      dot: 'bg-success',
      note: 'Closed / Safe — no ventilation needed.',
    },
    {
      id: 'level-1-light',
      level: 'Level 1',
      interval: `${safe} ≤ indoor < ${mod} ppm`,
      gate: `Δ ≥ ${dmin} ppm`,
      action: 'Fan OFF · Damper 30°',
      color: 'border-primary/40 bg-primary/5',
      dot: 'bg-primary',
      note: 'Light Ventilation — passive intake only.',
    },
    {
      id: 'level-2-medium',
      level: 'Level 2',
      interval: `${mod} ≤ indoor < ${high} ppm`,
      gate: `Δ ≥ ${dmin} ppm`,
      action: 'Fan ON · Damper 60°',
      color: 'border-warning/40 bg-warning/5',
      dot: 'bg-warning',
      note: 'Medium Ventilation — active exhaust engaged.',
    },
    {
      id: 'level-3-aggressive',
      level: 'Level 3',
      interval: `indoor ≥ ${high} ppm`,
      gate: `Δ ≥ ${dmin} ppm`,
      action: 'Fan ON · Damper 90° (Full Open)',
      color: 'border-destructive/40 bg-destructive/5',
      dot: 'bg-destructive',
      note: 'Aggressive Ventilation — highest supervisory level.',
    },
    {
      id: 'level-blocked-outdoor-worse',
      level: 'Override',
      interval: `indoor ≥ ${safe} ppm`,
      gate: `Δ < ${dmin} ppm`,
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
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Supervisory Control Flow</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Three layered stages: <span className="text-foreground font-medium">Decision</span> (IF-ELSE rules over sensor inputs) →{' '}
            <span className="text-foreground font-medium">Mapping</span> (level → actuator targets) →{' '}
            <span className="text-foreground font-medium">Execution</span> (drive damper + fan).
          </p>
          <div className="space-y-1">
            {flowSteps.map((step, i) => (
              <div key={step.title}>
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
                      <step.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-xs font-semibold text-foreground">{step.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{step.desc}</p>
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="flex justify-start ml-[18px]">
                    <ArrowDown className="h-3 w-3 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Control Logic */}
        <div className="space-y-6">
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">IF-ELSE Rule Base — Supervisory Decision Layer</h3>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              The supervisor classifies <span className="text-foreground font-medium">indoor CO₂</span> into one of four non-overlapping intervals to select a discrete <span className="font-semibold text-foreground">ventilation level (0–3)</span>. The output mapping layer then translates the level into actuator targets. A ±{hysteresis} ppm stabilization band only smooths boundary transitions.
            </p>

            {/* Δ explanation block */}
            <div className="rounded-md border border-border bg-muted/20 p-3 mb-4 text-[11px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-3 w-3 text-primary" />
                <span className="text-xs font-semibold text-foreground">How Δ gates ventilation</span>
              </div>
              <p className="text-muted-foreground">
                <span className="font-mono text-foreground">Δ = indoor − outdoor</span>. A positive Δ means indoor air is worse than outdoor air. Ventilation above Level 0 is only authorised when{' '}
                <span className="font-mono text-foreground">Δ ≥ {dmin} ppm</span>, i.e. outdoor air is sufficiently cleaner to actually improve indoor quality.
              </p>
              <p className="text-muted-foreground mt-1">
                <span className="text-foreground font-medium">Example:</span> indoor = 950, outdoor = 420 → Δ = 530 ≥ {dmin} ✓ — supervisor selects Level 2 (Medium). If outdoor were 920, Δ = 30 &lt; {dmin} → ventilation is blocked.
              </p>
            </div>

            <div className="space-y-2">
              {controlRules.map(rule => {
                const isActive = rule.id === evalSnap.rule;
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      'p-3 rounded-md border transition-colors',
                      rule.color,
                      isActive && 'ring-2 ring-primary/60 shadow-md shadow-primary/10',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', rule.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{rule.level}</span>
                          {isActive && (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Active</span>
                          )}
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 items-baseline">
                          <p className="text-xs font-mono text-foreground">{rule.interval}</p>
                          <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{rule.gate}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">→ {rule.action}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">{rule.note}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How decision is made / why blocked */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold text-foreground">How the decision is made</span>
                </div>
                <p className="text-muted-foreground leading-snug">
                  Indoor CO₂ is matched to exactly one interval (Level 0–3). For any level &gt; 0, Δ must clear the minimum outdoor advantage; otherwise the supervisor falls back to Level 0.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Ban className="h-3 w-3 text-warning" />
                  <span className="text-xs font-semibold text-foreground">Why ventilation may be blocked</span>
                </div>
                <p className="text-muted-foreground leading-snug">
                  When <span className="font-mono text-foreground">Δ &lt; {dmin}</span>, opening the damper would draw in air that is no better — the supervisor seals the system to prevent counter-productive operation.
                </p>
              </div>
            </div>
          </div>

          {/* Threshold Summary (live) */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Decision Boundaries (Live)</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-muted/30 rounded-md p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Safe</p>
                <p className="text-lg font-bold font-mono text-success leading-tight">{safe}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Moderate</p>
                <p className="text-lg font-bold font-mono text-primary leading-tight">{mod}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">High</p>
                <p className="text-lg font-bold font-mono text-destructive leading-tight">{high}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Min Δ</p>
                <p className="text-lg font-bold font-mono text-warning leading-tight">{dmin}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Stab.</p>
                <p className="text-lg font-bold font-mono text-muted-foreground leading-tight">±{hysteresis}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
            </div>
          </div>

          {/* Current Evaluation Snapshot */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Current Evaluation Snapshot
            </h3>

            {/* Inputs row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted/30 rounded-md p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Indoor</p>
                <p className="font-mono text-sm font-semibold text-foreground">{latest ? latest.indoorCO2 : '—'}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outdoor</p>
                <p className="font-mono text-sm font-semibold text-foreground">{latest ? latest.outdoorCO2 : '—'}</p>
                <p className="text-[9px] text-muted-foreground">ppm</p>
              </div>
              <div className={cn('rounded-md p-2 text-center', deltaOk ? 'bg-success/10' : 'bg-warning/10')}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Δ</p>
                <p className={cn('font-mono text-sm font-semibold', deltaOk ? 'text-success' : 'text-warning')}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
                </p>
                <p className="text-[9px] text-muted-foreground">{deltaOk ? `≥ ${dmin}` : `< ${dmin}`} ppm</p>
              </div>
            </div>

            {/* Decision → Mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="border-l-2 border-primary pl-3 py-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Decision layer</p>
                <p className="font-mono text-foreground font-semibold">{evalSnap.ventilationLabel}</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{evalSnap.ruleLabel}</p>
              </div>
              <div className="border-l-2 border-warning pl-3 py-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Output mapping</p>
                <p className="font-mono text-foreground">
                  Fan {evalSnap.recommendation.fanStatus} · Damper {evalSnap.recommendedDamperAngle}°
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Action: {evalSnap.recommendation.damperAction}</p>
              </div>
            </div>

            <div className="mt-3 border-l-2 border-success pl-3 py-1 text-xs">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reasoning</p>
              <p className="text-foreground leading-snug">{evalSnap.decision}</p>
              {blocked && (
                <p className="text-warning text-[11px] mt-1 italic">
                  Blocked: outdoor air offers no advantage (Δ &lt; {dmin}).
                </p>
              )}
            </div>
          </div>

          {/* Data Flow */}
          <div className="panel p-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Data Flow</h3>
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex-1 text-center bg-muted/30 rounded-md p-2.5">
                <Cpu className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-xs">ESP32</p>
                <p className="text-muted-foreground text-[10px]">Sensors + supervisor</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-muted/30 rounded-md p-2.5">
                <Database className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-xs">Backend API</p>
                <p className="text-muted-foreground text-[10px]">Node / Express</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-muted/30 rounded-md p-2.5">
                <Monitor className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="font-semibold text-foreground text-xs">Dashboard</p>
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
