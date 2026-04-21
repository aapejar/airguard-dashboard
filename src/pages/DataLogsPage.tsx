import { DashboardLayout } from '@/components/DashboardLayout';
import { LogsTable } from '@/components/LogsTable';
import { useDevice } from '@/context/DeviceContext';
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
import { useState } from 'react';

export default function DataLogsPage() {
  const { history, clearHistory } = useDevice();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearLogs = () => {
    clearHistory();
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
          disabled={history.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md hover:bg-destructive/20 disabled:opacity-40 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All Logs
        </button>
      </div>
      <LogsTable data={history} paginated showFilters />

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Clear All Logs?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete all {history.length} log entries. This action cannot be undone.
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
