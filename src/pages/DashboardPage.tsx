import { DashboardLayout } from '@/components/DashboardLayout';
import { SensorCard } from '@/components/SensorCard';
import { CO2Chart } from '@/components/CO2Chart';
import { AlertsPanel } from '@/components/AlertsPanel';
import { SystemStatusPanel } from '@/components/SystemStatusPanel';
import { Wind, Fan, Gauge, Activity, ToggleRight, PlayCircle } from 'lucide-react';
import { useDevice } from '@/context/DeviceContext';

export default function DashboardPage() {
  const { latest, status, history, alerts, clearAlerts, thresholds, isReadyState, resumeSimulation } = useDevice();

  const getCO2Status = (val: number): 'normal' | 'warning' | 'critical' => {
    if (val >= thresholds.criticalThreshold) return 'critical';
    if (val >= thresholds.warningThreshold) return 'warning';
    return 'normal';
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time air quality overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
          <span className="text-xs text-muted-foreground font-mono">
            {status.deviceOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {isReadyState && (
        <div className="panel p-4 mb-4 flex items-center justify-between border-primary/30">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">System Ready</p>
              <p className="text-xs text-muted-foreground">Seeded simulation finished. Awaiting live data from device, or resume simulation for demo.</p>
            </div>
          </div>
          <button
            onClick={resumeSimulation}
            className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shrink-0"
          >
            Resume Simulation
          </button>
        </div>
      )}

      {/* Primary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
        <div className="lg:col-span-1">
          <SensorCard
            label="Indoor CO₂"
            value={latest.indoorCO2}
            unit="ppm"
            icon={Wind}
            status={getCO2Status(latest.indoorCO2)}
            subtitle={latest.indoorCO2 > latest.outdoorCO2 ? '↑ Above outdoor level' : '↓ Below outdoor level'}
            highlight
          />
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <SensorCard label="Outdoor CO₂" value={latest.outdoorCO2} unit="ppm" icon={Wind} status="normal" />
          <SensorCard
            label="Fan Status"
            value={latest.fanStatus}
            icon={Fan}
            status={latest.fanStatus === 'ON' ? 'normal' : undefined}
            subtitle={latest.fanStatus === 'ON' ? 'Running' : 'Stopped'}
          />
          <SensorCard label="Damper" value={latest.damperAngle} unit="°" icon={Gauge} />
          <SensorCard
            label="Ventilation"
            value={latest.ventilationStatus}
            icon={Activity}
            status={latest.ventilationStatus === 'ACTIVE' ? 'normal' : undefined}
          />
          <SensorCard
            label="Control Mode"
            value={latest.controlMode}
            icon={ToggleRight}
            subtitle={latest.controlMode === 'AUTO' ? 'Automatic' : 'Manual override'}
          />
        </div>
      </div>

      {/* Chart + Status + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <CO2Chart data={history} />
        </div>
        <div className="space-y-4">
          <SystemStatusPanel status={status} />
          <AlertsPanel alerts={alerts} onClear={clearAlerts} />
        </div>
      </div>
    </DashboardLayout>
  );
}
