import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SensorReading } from '@/types/sensor';

interface CO2ChartProps {
  data: SensorReading[];
}

export function CO2Chart({ data }: CO2ChartProps) {
  const chartData = data.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    indoor: r.indoorCO2,
    outdoor: r.outdoorCO2,
  }));

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">CO₂ Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220 18% 13%)',
              border: '1px solid hsl(220 14% 20%)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="indoor" stroke="hsl(174 72% 46%)" strokeWidth={2} dot={false} name="Indoor CO₂" />
          <Line type="monotone" dataKey="outdoor" stroke="hsl(215 12% 55%)" strokeWidth={1.5} dot={false} name="Outdoor CO₂" strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
