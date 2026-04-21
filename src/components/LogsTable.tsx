import { useState, useMemo } from 'react';
import type { SensorReading } from '@/types/sensor';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogsTableProps {
  data: SensorReading[];
  maxRows?: number;
  paginated?: boolean;
  showFilters?: boolean;
}

function getCO2Status(val: number): 'normal' | 'warning' | 'critical' {
  if (val >= 1000) return 'critical';
  if (val >= 600) return 'warning';
  return 'normal';
}

const PAGE_SIZE = 15;

type StatusFilter = 'all' | 'normal' | 'warning' | 'critical';
type ModeFilter = 'all' | 'AUTO' | 'MANUAL';
type RangeFilter = 'all' | '1h' | '24h' | '7d';

export function LogsTable({ data, maxRows, paginated, showFilters }: LogsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

  const filtered = useMemo(() => {
    let rows = [...data].reverse();
    if (rangeFilter !== 'all') {
      const cutoff = Date.now() - ({ '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 })[rangeFilter];
      rows = rows.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    if (statusFilter !== 'all') {
      rows = rows.filter(r => getCO2Status(r.indoorCO2) === statusFilter);
    }
    if (modeFilter !== 'all') {
      rows = rows.filter(r => r.controlMode === modeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        new Date(r.timestamp).toLocaleString().toLowerCase().includes(q) ||
        r.fanStatus.toLowerCase().includes(q) ||
        r.ventilationStatus.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data, search, statusFilter, modeFilter, rangeFilter]);

  const rows = paginated
    ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : maxRows
      ? filtered.slice(0, maxRows)
      : filtered;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="panel overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider shrink-0">Sensor Logs</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {showFilters && (
            <>
              <select
                value={rangeFilter}
                onChange={e => { setRangeFilter(e.target.value as RangeFilter); setPage(0); }}
                className="px-2 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All time</option>
                <option value="1h">Last hour</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
                className="px-2 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All status</option>
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={modeFilter}
                onChange={e => { setModeFilter(e.target.value as ModeFilter); setPage(0); }}
                className="px-2 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All modes</option>
                <option value="AUTO">AUTO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </>
          )}
          {(paginated || filtered.length > 10) && (
            <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-1.5 bg-muted border border-border rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Time</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">CO₂ In</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">CO₂ Out</th>
              <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Fan</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Damper</th>
              <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Mode</th>
              <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Vent</th>
              <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const status = getCO2Status(row.indoorCO2);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/20',
                    status === 'critical' && 'bg-destructive/5',
                    status === 'warning' && 'bg-warning/5',
                  )}
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(row.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-semibold', {
                    'text-foreground': status === 'normal',
                    'text-warning': status === 'warning',
                    'text-destructive': status === 'critical',
                  })}>
                    {row.indoorCO2}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.outdoorCO2}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn('text-xs font-semibold', row.fanStatus === 'ON' ? 'text-success' : 'text-muted-foreground')}>
                      {row.fanStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{row.damperAngle}°</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{row.controlMode}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{row.ventilationStatus}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn('status-badge', {
                      'status-normal': status === 'normal',
                      'status-warning': status === 'warning',
                      'status-critical': status === 'critical',
                    })}>
                      <span className={cn('h-1.5 w-1.5 rounded-full inline-block', {
                        'bg-success': status === 'normal',
                        'bg-warning': status === 'warning',
                        'bg-destructive': status === 'critical',
                      })} />
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  <p className="text-sm">No log entries match the current filters.</p>
                  <p className="text-xs mt-1">Adjust filters or wait for new sensor readings to arrive.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} entries · Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
