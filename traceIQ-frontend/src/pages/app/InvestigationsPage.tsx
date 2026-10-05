import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { investigationApi } from '../../api/detections.api';
import { RelativeTime } from '../../components/shared/RelativeTime';
import { EmptyState } from '../../components/shared/EmptyState';

interface Investigation {
  id: string;
  query: string;
  actor?: string | null;
  summary: string;
  findings: string[];
  recommendations: string[];
  createdAt: string;
}

function InvestigationRow({ item }: { item: Investigation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border">
      {/* Summary row — always visible */}
      <div
        onClick={() => setExpanded(v => !v)}
        className="flex items-start gap-4 py-5 cursor-pointer hover:bg-elevated/40 transition-colors"
      >
        {/* AI dot */}
        <span className="w-2 h-2 bg-accent-ai shrink-0 mt-1.5" />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-sans text-primary mb-1.5 truncate">{item.query}</p>
          <div className="flex items-center gap-3 font-mono text-[12px] text-secondary">
            {item.actor && (
              <>
                <span className="text-code">{item.actor}</span>
                <span className="text-muted">·</span>
              </>
            )}
            <RelativeTime date={item.createdAt} />
          </div>
        </div>

        <span className="text-muted shrink-0 mt-0.5">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-elevated/30 px-6 py-5 flex flex-col gap-5">

          {/* Summary */}
          <div>
            <p className="kicker mb-3">Summary</p>
            <p className="text-[14px] text-secondary leading-relaxed font-sans">{item.summary}</p>
          </div>

          {/* Findings */}
          {item.findings.length > 0 && (
            <div>
              <p className="kicker mb-3">Findings ({item.findings.length})</p>
              <div className="flex flex-col gap-0">
                {item.findings.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-3 py-3 border-b border-border last:border-b-0 text-[14px] text-secondary leading-relaxed"
                  >
                    <span className="font-mono text-[11px] text-muted shrink-0 mt-0.5 tracking-widest">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {item.recommendations.length > 0 && (
            <div>
              <p className="kicker mb-3">Recommendations</p>
              <div className="flex flex-col gap-0">
                {item.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-3 py-3 border-b border-border last:border-b-0 text-[14px] text-secondary leading-relaxed"
                  >
                    <span className="font-mono text-[11px] text-accent shrink-0 mt-0.5 tracking-widest">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export function InvestigationsPage() {
  const [cursor, setCursor]               = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['investigations', 'history', cursor],
    queryFn: () => investigationApi.listHistory({ cursor, limit: 15 }),
  });

  const investigations: Investigation[] = data?.data ?? [];
  const meta = data?.meta;

  const handleNext = () => {
    if (meta?.nextCursor) {
      setCursorHistory(h => [...h, cursor ?? '']);
      setCursor(meta.nextCursor);
    }
  };

  const handlePrev = () => {
    const history = [...cursorHistory];
    const prev = history.pop();
    setCursorHistory(history);
    setCursor(prev === '' ? undefined : prev);
  };

  const paginationBtn =
    'px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px]';

  return (
    <div className="flex flex-col h-full gap-0 animate-blur-fade-in">

      {/* Page header */}
      <div className="pb-6">
        <p className="kicker mb-3">04 / Investigation History</p>
        <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
          Investigations
        </h1>
      </div>

      <div className="rule mb-0" />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="kicker">Loading investigations…</p>
        </div>
      ) : investigations.length === 0 ? (
        <EmptyState
          title="No investigations yet"
          description="Run an AI investigation from the Detections page or an actor profile to see results here."
          icon={<Bot size={32} />}
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            {investigations.map(item => (
              <InvestigationRow key={item.id} item={item} />
            ))}
          </div>

          <div className="flex justify-end items-center gap-2 pt-4 border-t border-border mt-2">
            <button onClick={handlePrev} disabled={cursorHistory.length === 0} className={paginationBtn}>
              ← Previous
            </button>
            <button onClick={handleNext} disabled={!meta?.nextCursor} className={paginationBtn}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

