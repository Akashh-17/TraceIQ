import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../api/events.api';
import { ActionBadge } from '../shared/Badges';
import { RelativeTime } from '../shared/RelativeTime';
import { CopyButton } from '../shared/CopyButton';

interface DrawerProps {
  eventId: string | null;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted w-20 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="text-[13px] text-primary font-sans">{children}</div>
    </div>
  );
}

export function EventDetailDrawer({ eventId, onClose }: DrawerProps) {
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getEventById(eventId!),
    enabled: !!eventId,
  });

  const { data: related } = useQuery({
    queryKey: ['event', eventId, 'related'],
    queryFn: () => eventsApi.getRelatedEvents(eventId!),
    enabled: !!eventId,
  });

  if (!eventId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-[480px] bg-surface border-l border-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <p className="kicker">Event Detail</p>
            {event && (
              <span className="font-mono text-[11px] text-muted">
                <RelativeTime date={event.createdAt} />
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-primary transition-colors"
          >
            Close ×
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="kicker">Loading…</p>
          </div>
        ) : event ? (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

            {/* Action badge + core fields */}
            <div>
              <div className="mb-4">
                <ActionBadge action={event.action} />
              </div>
              <DetailRow label="Actor">
                <button
                  className="font-mono text-code hover:underline text-left"
                  onClick={() => { onClose(); navigate(`/actors/${encodeURIComponent(event.actor)}`); }}
                >
                  {event.actor} ↗
                </button>
              </DetailRow>
              <DetailRow label="Resource">
                <span>
                  {event.resourceType}
                  {' / '}
                  <span className="font-mono text-code">{event.resourceId}</span>
                </span>
              </DetailRow>
              <DetailRow label="Source">
                <span className="font-mono text-[12px]">{event.sourceService}</span>
              </DetailRow>
            </div>

            {/* Metadata */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="kicker">Metadata</p>
                <CopyButton text={JSON.stringify(event.metadata, null, 2)} />
              </div>
              <div className="rule mb-3" />
              <pre className="bg-input border border-border px-4 py-3 text-[12px] font-mono text-primary overflow-x-auto whitespace-pre-wrap rounded-[4px]">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>

            {/* NL Summary */}
            {event.nlRepresentation && (
              <div>
                <p className="kicker mb-3">NL Summary</p>
                <div className="rule mb-3" />
                <p className="text-[13px] leading-relaxed text-primary bg-input px-4 py-3 border-l-2 border-secondary font-sans">
                  {event.nlRepresentation}
                </p>
              </div>
            )}

            {/* Related events */}
            <div>
              <p className="kicker mb-3">Related Events (±30 min)</p>
              <div className="rule" />
              {related?.length > 0 ? (
                related.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 text-[12px]"
                  >
                    <span className="font-mono text-muted shrink-0">
                      <RelativeTime date={r.createdAt} />
                    </span>
                    <span className="text-muted">·</span>
                    <span className="font-mono text-code">{r.action}</span>
                  </div>
                ))
              ) : (
                <p className="font-mono text-[12px] text-muted py-3">No related events found.</p>
              )}
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="kicker">Event not found.</p>
          </div>
        )}

        {/* Footer CTA */}
        {event && (
          <div className="px-5 py-4 border-t border-border shrink-0">
            <button
              className="w-full flex items-center justify-center gap-2 border border-accent-ai/40 bg-accent-ai/10 text-accent-ai rounded-[4px] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-accent-ai/20 transition-colors"
              onClick={() => { onClose(); navigate(`/detections?actor=${encodeURIComponent(event.actor)}`); }}
            >
              <span className="w-1.5 h-1.5 bg-accent-ai" />
              Investigate Actor with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
