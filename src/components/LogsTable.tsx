import type { SensorReading } from '@/types/sensor';
import { cn } from '@/lib/utils';

interface LogsTableProps {
  data: SensorReading[];
  maxRows?: number;
}

function getCO2Status(val: number): 'normal' | 'warning' | 'critical' {
  if (val >= 1000) return 'critical';
  if (val >= 600) return 'warning';
  return 'normal';
}

export function LogsTable({ data, maxRows = 10 }: LogsTableProps) {
  const rows = data.slice(-maxRows).reverse();

  return (
    <div className="panel overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent Sensor Logs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Time</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">CO₂ In</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">CO₂ Out</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Temp</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Humidity</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Fan</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Damper</th>
              <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const status = getCO2Status(row.indoorCO2);
              return (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.indoorCO2}</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.outdoorCO2}</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.temperature}°</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.humidity}%</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.fanSpeed}%</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.damperAngle}°</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn('status-badge', {
                      'status-normal': status === 'normal',
                      'status-warning': status === 'warning',
                      'status-critical': status === 'critical',
                    })}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
