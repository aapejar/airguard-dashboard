import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDevice } from '@/context/DeviceContext';
import type { AlertSource } from '@/types/sensor';
import { ClipboardList, Trash2, Download, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const sources: Array<'all' | AlertSource> = ['all', 'auth', 'user', 'system', 'device'];
const levels = ['all', 'info', 'warning', 'critical'] as const;

const levelIcon = { info: Info, warning: AlertTriangle, critical: XCircle };
const levelColor = {
  info: 'text-primary',
  warning: 'text-warning',
  critical: 'text-destructive',
};

export default function AuditLogPage() {
  const { auditLog, clearAuditLog } = useDevice();
  const [source, setSource] = useState<'all' | AlertSource>('all');
  const [level, setLevel] = useState<typeof levels[number]>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return auditLog.filter(e => {
      if (source !== 'all' && e.source !== source) return false;
      if (level !== 'all' && e.level !== level) return false;
      if (search.trim() && !e.message.toLowerCase().includes(search.toLowerCase()) && !(e.actor ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [auditLog, source, level, search]);

  const exportCsv = () => {
    const header = 'timestamp,level,source,actor,message\n';
    const rows = filtered.map(e =>
      [e.timestamp, e.level, e.source ?? '', e.actor ?? '', `"${e.message.replace(/"/g, '""')}"`].join(','),
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airguard-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Authentication, control, and configuration activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground bg-muted border border-border rounded-md hover:bg-muted/80 disabled:opacity-40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={clearAuditLog}
            disabled={auditLog.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md hover:bg-destructive/20 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="panel p-4 mb-4 flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <select value={source} onChange={e => setSource(e.target.value as 'all' | AlertSource)} className="px-2 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary">
          {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value as typeof levels[number])} className="px-2 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary">
          {levels.map(l => <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search message or actor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground font-mono ml-auto">{filtered.length} / {auditLog.length}</span>
      </div>

      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No activity matches the current filters.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Time</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Level</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Source</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Actor</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const Icon = levelIcon[e.level];
                return (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn('inline-flex items-center gap-1', levelColor[e.level])}>
                        <Icon className="h-3 w-3" /> {e.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{e.source ?? '—'}</td>
                    <td className="px-4 py-2 text-foreground">{e.actor ?? '—'}</td>
                    <td className="px-4 py-2 text-foreground">{e.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
