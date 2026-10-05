import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { actorsApi } from '../../api/users.api';
import { eventsApi } from '../../api/events.api';
import { ActionBadge } from '../../components/shared/Badges';
import { RelativeTime } from '../../components/shared/RelativeTime';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { cn } from '@/lib/utils';

export function ActorProfilePage() {
  const { actor } = useParams<{ actor: string }>();
  const navigate  = useNavigate();

  // ── Profile (summary stats) ──────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['actor', actor],
    queryFn:  () => actorsApi.getActorProfile(actor!),
    enabled:  !!actor,
  });

  // ── Timeline (paginated audit events for this actor) ─────────────────────────
  // Accumulate events across pages; cursor tracks the current page boundary.
  const [timelineCursor, setTimelineCursor]   = useState<string | undefined>(undefined);
  const [timelineEvents, setTimelineEvents]   = useState<any[]>([]);
  const [timelineNextCursor, setTimelineNextCursor] = useState<string | null>(null);

  // Reset timeline when actor changes (e.g. navigating between profiles)
  useEffect(() => {
    setTimelineCursor(undefined);
    setTimelineEvents([]);
    setTimelineNextCursor(null);
  }, [actor]);

  const { data: timelinePage, isFetching: timelineLoading } = useQuery({
    queryKey: ['actor-timeline', actor, timelineCursor],
    queryFn:  () => eventsApi.getEvents({ actor: actor!, cursor: timelineCursor, limit: 15 }),
    enabled:  !!actor && !!data, // wait until profile loaded to confirm actor exists
  });

  useEffect(() => {
    if (!timelinePage?.data) return;
    setTimelineEvents(prev =>
      timelineCursor === undefined ? timelinePage.data : [...prev, ...timelinePage.data]
    );
    setTimelineNextCursor(timelinePage.meta?.nextCursor ?? null);
  }, [timelinePage]);

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="kicker">Loading actor profile…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="kicker">Actor not found or no events recorded.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px]"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const {
    actor: actorEmail,
    totalEvents,
    uniqueActions,
    totalDetections,
    firstSeen,
    lastSeen,
    services,
    topActions,
  } = data;

  const maxCount: number = topActions?.[0]?.count || 1;

  return (
    <div className="flex flex-col gap-10 animate-blur-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-primary transition-colors"
            >
              ← Back
            </button>
            <span className="text-muted text-[10px]">/</span>
            <p className="kicker">Actor Profile</p>
          </div>

          {/* Avatar + email */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center justify-center w-10 h-10 border border-border bg-elevated font-heading text-xl font-medium text-primary shrink-0">
              {actorEmail?.[0]?.toUpperCase()}
            </div>
            <h1 className="font-heading text-3xl font-medium text-gradient leading-tight truncate">
              {actorEmail}
            </h1>
          </div>

          {/* First / Last seen */}
          {(firstSeen || lastSeen) && (
            <div className="flex items-center gap-4 font-mono text-[11px] text-muted">
              {firstSeen && (
                <span>First seen <RelativeTime date={firstSeen} /></span>
              )}
              {firstSeen && lastSeen && <span>·</span>}
              {lastSeen && (
                <span>Last seen <RelativeTime date={lastSeen} /></span>
              )}
            </div>
          )}
        </div>

        {/* AI Investigate button */}
        <button
          onClick={() => navigate(`/detections?actor=${encodeURIComponent(actorEmail)}`)}
          className="mt-2 flex items-center gap-2 border border-accent-ai/40 bg-accent-ai/10 text-accent-ai rounded-[4px] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-accent-ai/20 transition-colors shrink-0"
        >
          <span className="w-1.5 h-1.5 bg-accent-ai" />
          AI Investigate
        </button>
      </div>

      {/* ── Services ── */}
      {services?.length > 0 && (
        <div>
          <p className="kicker mb-3">Services Accessed</p>
          <div className="flex flex-wrap gap-2">
            {services.map((s: string) => (
              <span
                key={s}
                className="px-3 py-1 border border-border font-mono text-[10px] uppercase tracking-[0.12em] text-secondary bg-elevated"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-8">
        <KpiCard title="Total Events"     value={totalEvents?.toLocaleString()} />
        <KpiCard title="Unique Actions"   value={uniqueActions} />
        <KpiCard title="Total Detections" value={totalDetections ?? 0} />
      </div>

      {/* ── Body: Timeline + Top Actions ── */}
      <div className="grid grid-cols-[1fr_320px] gap-10 max-[900px]:grid-cols-1">

        {/* Activity Timeline */}
        <div>
          <p className="kicker mb-4">Activity Timeline</p>
          <div className="rule" />

          {timelineEvents.length === 0 && !timelineLoading && (
            <p className="font-mono text-[12px] text-muted pt-4">No events found.</p>
          )}

          <div className="relative">
            {/* Vertical line — runs through the dot column */}
            {timelineEvents.length > 0 && (
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
            )}

            <div className="flex flex-col">
              {timelineEvents.map((e: any) => (
                <div key={e.id} className="flex gap-4 py-3 relative">
                  {/* Dot */}
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full border shrink-0 mt-0.5 z-10',
                    'border-accent-ai/40 bg-accent-ai/15'
                  )} />

                  {/* Event info */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBadge action={e.action} />
                      <span className="font-mono text-[11px] text-muted">
                        <RelativeTime date={e.createdAt} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-secondary">
                      <span>{e.resourceType}</span>
                      {e.resourceId && (
                        <>
                          <span className="text-muted">·</span>
                          <span className="text-muted truncate max-w-[180px]">{e.resourceId}</span>
                        </>
                      )}
                      {e.sourceService && (
                        <>
                          <span className="text-muted">·</span>
                          <span className="text-muted/60">{e.sourceService}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Load more */}
          {(timelineNextCursor || timelineLoading) && (
            <div className="pt-4 border-t border-border mt-2">
              <button
                disabled={timelineLoading}
                onClick={() => setTimelineCursor(timelineNextCursor!)}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {timelineLoading ? 'Loading…' : 'Load more ↓'}
              </button>
            </div>
          )}
        </div>

        {/* Top Actions */}
        <div>
          <p className="kicker mb-4">Top Actions</p>
          <div className="rule" />
          <div className="flex flex-col gap-4 pt-4">
            {(topActions || []).map((a: any) => (
              <div key={a.action} className="flex items-center gap-3">
                <ActionBadge action={a.action} />
                <div className="flex-1 h-0.5 bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (a.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[12px] text-secondary min-w-[30px] text-right tabular-nums">
                  {a.count}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
