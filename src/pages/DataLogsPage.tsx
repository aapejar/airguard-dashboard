import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LogsTable } from '@/components/LogsTable';
import { generateHistoricalReadings } from '@/data/mockData';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DataLogsPage() {
  const [logs, setLogs] = useState(() => generateHistoricalReadings(100));
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearLogs = () => {
    setLogs([]);
    setShowClearConfirm(false);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Data Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Historical sensor readings</p>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md hover:bg-destructive/20 disabled:opacity-40 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All Logs
        </button>
      </div>
      <LogsTable data={logs} paginated />

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Clear All Logs?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete all {logs.length} log entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLogs} className="bg-destructive text-destructive-foreground hover:opacity-90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
