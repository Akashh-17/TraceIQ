import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axios';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const fetchRecentEvents = async () => {
  const { data } = await api.get('/api/v1/events', { params: { limit: 20 } });
  return data.data ?? [];
};

function getEventStyle(action: string): 'danger' | 'warning' | 'normal' {
  if (action?.includes('FAILED') || action?.includes('DENIED') || action?.includes('LOCKED')) return 'danger';
  if (action?.includes('EXPORTED') || action?.includes('DELETED')) return 'warning';
  return 'normal';
}

const dotColor: Record<string, string> = {
  danger: 'bg-sev-high',
  warning: 'bg-sev-med',
  normal:  'bg-sev-low',
};

const actionColor: Record<string, string> = {
  danger: 'text-sev-high',
  warning: 'text-sev-med',
  normal:  'text-code',
};

export function LiveFeed() {
  const listRef = useRef<HTMLDivElement>(null);

  const { data: events = [], dataUpdatedAt } = useQuery({
    queryKey: ['liveFeed'],
    queryFn: fetchRecentEvents,
    refetchInterval: 5000,
    staleTime: 0,
  });

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [dataUpdatedAt]);

  return (
    <div className="border border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full bg-sev-high opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 bg-sev-high" />
        </span>
        <p className="kicker flex-1">Live Activity</p>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">5s</span>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto flex flex-col">
        {events.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-secondary">
            No recent events…
          </p>
        ) : (
          events.map((e: any, i: number) => {
            const style = getEventStyle(e.action);
            return (
              <div
                key={e.id ?? i}
                className="flex items-start gap-3 px-4 py-2.5 border-b border-border-muted last:border-b-0"
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0', dotColor[style])} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[12px] font-semibold font-mono truncate', actionColor[style])}>
                    {e.action}
                  </p>
                  <p className="text-[11px] text-secondary font-mono truncate">{e.actor}</p>
                </div>
                <span className="text-[11px] text-muted font-mono shrink-0 mt-0.5">
                  {e.createdAt ? format(new Date(e.createdAt), 'HH:mm:ss') : ''}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
