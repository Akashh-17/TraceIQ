import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { eventsApi } from '../../api/events.api';
import { DateRangeFilter, type DateRangeDays, daysToFromDate } from '../../components/shared/DateRangeFilter';
import { EventsTable } from '../../components/events/EventsTable';
import { EventDetailDrawer } from '../../components/events/EventDetailDrawer';
import { EmptyState } from '../../components/shared/EmptyState';
import { CopyButton } from '../../components/shared/CopyButton';

const CURL_EXAMPLE = `curl -X POST http://localhost:3000/api/v1/events \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "actor": "admin@acme.com",
    "action": "DATA_EXPORTED",
    "source_service": "PAYMENTS",
    "resource_type": "transaction",
    "resource_id": "txn_12345",
    "metadata": { "recordsCount": 5000 }
  }'`;

const inputCls =
  'bg-input border border-border text-primary text-[12px] px-3 py-1.5 rounded-[4px] focus:outline-none focus:border-accent transition-colors placeholder:text-muted font-mono';

const paginationBtn =
  'px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px]';

export function EventsPage() {
  const [cursor, setCursor]               = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [actorFilter, setActorFilter]   = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange]       = useState<DateRangeDays>(null);
  const [appliedFilters, setAppliedFilters] = useState({ actor: '', action: '', dateRange: null as DateRangeDays });

  const { data, isLoading } = useQuery({
    queryKey: ['events', cursor, appliedFilters],
    queryFn: () => eventsApi.getEvents({
      cursor,
      actor:  appliedFilters.actor  || undefined,
      action: appliedFilters.action || undefined,
      from:   daysToFromDate(appliedFilters.dateRange),
      limit: 20,
    }),
  });

  const applyFilters = () => {
    setCursor(undefined);
    setCursorHistory([]);
    setAppliedFilters({ actor: actorFilter, action: actionFilter, dateRange });
  };

  const exportMutation = useMutation({
    mutationFn: () => eventsApi.exportCsv({
      actor:  appliedFilters.actor  || undefined,
      action: appliedFilters.action || undefined,
      from:   daysToFromDate(appliedFilters.dateRange),
    }),
  });

  const handleNext = () => {
    if (data?.meta?.nextCursor) {
      setCursorHistory(h => [...h, cursor ?? '']);
      setCursor(data.meta.nextCursor);
    }
  };

  const handlePrev = () => {
    const h = [...cursorHistory];
    const prev = h.pop();
    setCursorHistory(h);
    setCursor(prev === '' ? undefined : prev);
  };

  return (
    <div className="flex flex-col h-full gap-0 animate-blur-fade-in">

      {/* Page header */}
      <div className="pb-6">
        <p className="kicker mb-3">02 / Audit Log</p>
        <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
          Audit Log
        </h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
        <DateRangeFilter value={dateRange} onChange={days => {
          setDateRange(days);
          setCursor(undefined);
          setCursorHistory([]);
          setAppliedFilters(f => ({ ...f, dateRange: days }));
        }} />
        <input
          type="text"
          placeholder="Filter by actor…"
          value={actorFilter}
          onChange={e => setActorFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className={inputCls}
        />
        <input
          type="text"
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className={inputCls}
        />
        <button
          onClick={applyFilters}
          className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px]"
        >
          Apply
        </button>
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="ml-auto px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exportMutation.isPending ? 'Exporting…' : 'Export CSV ↓'}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="kicker">Loading events…</p>
        </div>
      ) : data?.data?.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Your audit log is currently empty. Ingest events using the TraceIQ API."
          icon={<Database size={28} />}
        >
          <div className="text-left bg-input border border-border p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="kicker">POST /api/v1/events</span>
              <CopyButton text={CURL_EXAMPLE} />
            </div>
            <pre className="font-mono text-[12px] text-primary whitespace-pre-wrap leading-relaxed">
              {CURL_EXAMPLE}
            </pre>
          </div>
        </EmptyState>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <EventsTable
              data={data?.data ?? []}
              onRowClick={ev => setSelectedEventId(ev.id)}
            />
          </div>

          <div className="flex justify-end items-center gap-2 pt-4 border-t border-border mt-2">
            <button onClick={handlePrev} disabled={cursorHistory.length === 0} className={paginationBtn}>
              ← Previous
            </button>
            <button onClick={handleNext} disabled={!data?.meta?.nextCursor} className={paginationBtn}>
              Next →
            </button>
          </div>
        </div>
      )}

      <EventDetailDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </div>
  );
}

