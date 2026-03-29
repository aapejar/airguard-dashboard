import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LogsTable } from '@/components/LogsTable';
import { generateHistoricalReadings } from '@/data/mockData';

export default function DataLogsPage() {
  const [logs] = useState(() => generateHistoricalReadings(100));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Data Logs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Historical sensor readings</p>
      </div>
      <LogsTable data={logs} maxRows={50} />
    </DashboardLayout>
  );
}
