import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { detectionsApi } from '../../api/detections.api';
import { DateRangeFilter, type DateRangeDays, daysToFromDate } from '../../components/shared/DateRangeFilter';
import { SeverityBadge } from '../../components/shared/Badges';
import { RelativeTime } from '../../components/shared/RelativeTime';
import { InvestigationPanel } from '../../components/detections/InvestigationPanel';
import { EmptyState } from '../../components/shared/EmptyState';
import { cn } from '@/lib/utils';

const SEVERITY_OPTIONS = ['', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS   = ['', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

const NEXT_STATUS: Record<string, string> = {
  OPEN:         'ACKNOWLEDGED',
  ACKNOWLEDGED: 'RESOLVED',
  RESOLVED:     'OPEN',
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  OPEN:         'Acknowledge',
  ACKNOWLEDGED: 'Resolve',
  RESOLVED:     'Re-open',
};

const SEV_DOT: Record<string, string> = {
  HIGH:   'bg-sev-high',
  MEDIUM: 'bg-sev-med',
  LOW:    'bg-sev-low',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN:         'bg-sev-high/10 text-sev-high border-sev-high/20',
  ACKNOWLEDGED: 'bg-status-ack/10 text-status-ack border-status-ack/20',
  RESOLVED:     'bg-status-resolved/10 text-status-resolved border-status-resolved/20',
};

const selectCls =
  'bg-input border border-border text-primary text-[12px] px-3 py-1.5 rounded-[4px] focus:outline-none focus:border-accent transition-colors font-mono uppercase tracking-[0.08em]';

const paginationBtn =
  'px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px]';

export function DetectionsPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [cursor, setCursor]           = useState<string | undefined>(undefined);
  const [history, setHistory]         = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [dateRange, setDateRange]           = useState<DateRangeDays>(null);
  const [appliedFilters, setAppliedFilters] = useState({ severity: '', status: '', dateRange: null as DateRangeDays });

  const actorFromUrl = searchParams.get('actor');
  const [panelOpen, setPanelOpen]               = useState(!!actorFromUrl);
  const [investigationActor, setInvestigationActor] = useState<string | null>(actorFromUrl);

  useEffect(() => {
    if (actorFromUrl) {
      setInvestigationActor(actorFromUrl);
      setPanelOpen(true);
    }
  }, [actorFromUrl]);

  const { data, isLoading } = useQuery({
    queryKey: ['detections', cursor, appliedFilters],
    queryFn: () =>
      detectionsApi.getDetections({
        cursor,
        limit: 15,
        severity: appliedFilters.severity || undefined,
        status:   appliedFilters.status   || undefined,
        from:     daysToFromDate(appliedFilters.dateRange),
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      detectionsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detections'] });
    },
  });

  const handleApplyFilters = () => {
    setCursor(undefined);
    setHistory([]);
    setAppliedFilters({ severity: severityFilter, status: statusFilter, dateRange });
  };

  const handleNext = () => {
    if (data?.meta?.nextCursor) {
      setHistory(prev => [...prev, cursor || '']);
      setCursor(data.meta.nextCursor);
    }
  };

  const handlePrev = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const prevCursor = newHistory.pop();
      setHistory(newHistory);
      setCursor(prevCursor === '' ? undefined : prevCursor);
    }
  };

  const handleOpenInvestigation = (actor: string) => {
    setInvestigationActor(actor);
    setPanelOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-0 animate-blur-fade-in">

      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="kicker mb-3">03 / Security Alerts</p>
          <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
            Detections
          </h1>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="mt-2 flex items-center gap-2 border border-accent-ai/40 bg-accent-ai/10 text-accent-ai rounded-[4px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-accent-ai/20 transition-colors"
        >
          <span className="w-1.5 h-1.5 bg-accent-ai" />
          AI Investigate
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border mb-0">
        <DateRangeFilter value={dateRange} onChange={days => {
          setDateRange(days);
          setCursor(undefined);
          setHistory([]);
          setAppliedFilters(f => ({ ...f, dateRange: days }));
        }} />
        <select
          className={selectCls}
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
        >
          {SEVERITY_OPTIONS.map(s => (
            <option key={s} value={s}>{s || 'All Severities'}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px]"
        >
          Apply
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="kicker">Loading detections…</p>
        </div>
      ) : (data?.data || []).length === 0 ? (
        <EmptyState
          title="No detections triggered"
          description="When your audit events match security rules, alerts will appear here."
          icon={<ShieldAlert size={32} />}
        >
          <div className="text-left bg-input border border-border p-4">
            <p className="kicker mb-3">Active Rules Engine</p>
            <ul className="flex flex-col gap-2 list-none pl-0">
              <li className="font-mono text-[12px] text-secondary">
                <strong className="text-sev-high">MULTIPLE_FAILED_LOGINS</strong>
                {' (HIGH) — 5+ failed logins by one actor within 10 mins'}
              </li>
              <li className="font-mono text-[12px] text-secondary">
                <strong className="text-sev-med">BULK_DATA_EXPORT</strong>
                {' (MEDIUM) — A data export of more than 1,000 records'}
              </li>
              <li className="font-mono text-[12px] text-secondary">
                <strong className="text-sev-low">AFTER_HOURS_ADMIN_ACTIVITY</strong>
                {' (LOW) — Admin activity before 08:00 or after 18:59'}
              </li>
            </ul>
          </div>
        </EmptyState>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            {(data?.data || []).map((d: any) => {
              const isSelected = investigationActor === d.actor && panelOpen;
              return (
                <div
                  key={d.id}
                  onClick={() => handleOpenInvestigation(d.actor)}
                  className={cn(
                    'flex items-center gap-4 py-5 border-b border-border cursor-pointer transition-colors',
                    isSelected ? 'bg-accent-ai/5' : 'hover:bg-elevated/50'
                  )}
                >
                  {/* Severity dot */}
                  <span className={cn('w-2 h-2 shrink-0', SEV_DOT[d.severity])} />

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SeverityBadge severity={d.severity} />
                      <span className="font-mono text-[14px] text-primary truncate">
                        {d.ruleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono text-[12px] text-secondary">
                      <span className="text-code">{d.actor}</span>
                      <span className="text-muted">·</span>
                      <RelativeTime date={d.triggeredAt} />
                      {d.supportingEventIds?.length > 0 && (
                        <>
                          <span className="text-muted">·</span>
                          <span>{d.supportingEventIds.length} events</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + action */}
                  <div
                    className="flex flex-col items-end gap-2 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <span
                      className={cn(
                        'px-2 py-0.5 border font-mono text-[10px] uppercase tracking-[0.12em]',
                        STATUS_BADGE[d.status] ?? 'border-border text-secondary'
                      )}
                    >
                      {d.status}
                    </span>
                    <button
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ id: d.id, status: NEXT_STATUS[d.status] })
                      }
                      className="font-mono text-[10px] uppercase tracking-[0.12em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {NEXT_STATUS_LABEL[d.status]} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end items-center gap-2 pt-4 border-t border-border mt-2">
            <button onClick={handlePrev} disabled={history.length === 0} className={paginationBtn}>
              ← Previous
            </button>
            <button onClick={handleNext} disabled={!data?.meta?.nextCursor} className={paginationBtn}>
              Next →
            </button>
          </div>
        </div>
      )}

      <InvestigationPanel
        isOpen={panelOpen}
        actor={investigationActor}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}

