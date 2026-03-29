import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SensorCard } from '@/components/SensorCard';
import { CO2Chart } from '@/components/CO2Chart';
import { AlertsPanel } from '@/components/AlertsPanel';
import { LogsTable } from '@/components/LogsTable';
import { Wind, Fan, Gauge, Activity, Wifi, ToggleRight, Zap } from 'lucide-react';
import type { SensorReading } from '@/types/sensor';
import { mockLatestReading, mockAlerts, mockSystemStatus, generateHistoricalReadings } from '@/data/mockData';
import { cn } from '@/lib/utils';

function getCO2Status(val: number): 'normal' | 'warning' | 'critical' {
  if (val >= 1000) return 'critical';
  if (val >= 600) return 'warning';
  return 'normal';
}

export default function DashboardPage() {
  const [latest] = useState(mockLatestReading);
  const [history] = useState<SensorReading[]>(() => generateHistoricalReadings(30));
  const status = mockSystemStatus;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time air quality overview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('status-badge', status.deviceOnline ? 'status-online' : 'status-offline')}>
            <Wifi className="h-3 w-3" />
            {status.deviceOnline ? 'Online' : 'Offline'}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{status.firmwareVersion}</span>
        </div>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
        <SensorCard
          label="Indoor CO₂"
          value={latest.indoorCO2}
          unit="ppm"
          icon={Wind}
          status={getCO2Status(latest.indoorCO2)}
          subtitle={latest.indoorCO2 > latest.outdoorCO2 ? '↑ Above outdoor' : '↓ Below outdoor'}
        />
        <SensorCard label="Outdoor CO₂" value={latest.outdoorCO2} unit="ppm" icon={Wind} status="normal" />
        <SensorCard label="TVOC" value={latest.tvoc} unit="ppb" icon={Zap} />
        <SensorCard
          label="Fan Status"
          value={latest.fanStatus}
          icon={Fan}
          status={latest.fanStatus === 'ON' ? 'normal' : undefined}
          subtitle={latest.fanStatus === 'ON' ? 'Running' : 'Stopped'}
        />
        <SensorCard label="Damper Angle" value={latest.damperAngle} unit="°" icon={Gauge} />
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
          subtitle={latest.controlMode === 'AUTO' ? 'Automatic regulation' : 'Manual override'}
        />
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <CO2Chart data={history} />
        </div>
        <AlertsPanel alerts={mockAlerts} />
      </div>

      {/* Logs */}
      <LogsTable data={history} maxRows={8} />
    </DashboardLayout>
  );
}
