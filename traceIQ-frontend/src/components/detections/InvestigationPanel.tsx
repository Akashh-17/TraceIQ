import { useState, useEffect, useRef } from 'react';
import { investigationApi } from '../../api/detections.api';
import { cn } from '@/lib/utils';

interface InvestigationResult {
  summary: string;
  findings: string[];
  recommendations: string[];
}

interface InvestigationPanelProps {
  isOpen: boolean;
  actor: string | null;
  onClose: () => void;
}

export function InvestigationPanel({ isOpen, actor, onClose }: InvestigationPanelProps) {
  const [result, setResult]   = useState<InvestigationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [query, setQuery]     = useState('');

  // The actor currently shown. An investigation takes ~10s; if the user picks another
  // detection meanwhile, the old result must not appear under the new actor's name.
  const currentActor = useRef(actor);

  useEffect(() => {
    currentActor.current = actor;
    setResult(null);
    setError(null);
    setLoading(false);
    setQuery(
      actor
        ? `Investigate the recent activity of ${actor} and identify any suspicious behaviour.`
        : ''
    );
  }, [actor]);

  const handleInvestigate = async () => {
    if (!actor || !query.trim()) return;
    const requestedFor = actor;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await investigationApi.investigate(actor, query.trim());
      if (currentActor.current === requestedFor) setResult(data);
    } catch (err: any) {
      if (currentActor.current === requestedFor) {
        setError(err.response?.data?.message ?? 'Investigation failed. Please try again.');
      }
    } finally {
      if (currentActor.current === requestedFor) setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 bottom-0 w-[520px] bg-surface border-l border-border flex flex-col z-[200]',
        'transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <p className="kicker">AI Investigation</p>
          <span className="w-1.5 h-1.5 bg-accent-ai" />
        </div>
        <button
          onClick={onClose}
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-primary transition-colors"
        >
          Close ×
        </button>
      </div>

      {/* Actor context */}
      {actor && (
        <div className="px-5 py-3 border-b border-border shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Actor / </span>
          <span className="font-mono text-[12px] text-code">{actor}</span>
        </div>
      )}

      {/* Query */}
      {actor && (
        <div className="px-5 py-4 shrink-0 border-b border-border">
          <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary block mb-2">
            Investigation Query
          </label>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything about this actor's behaviour…"
            rows={3}
            disabled={loading}
            className="w-full bg-input border border-border text-primary text-[13px] px-3 py-2 rounded-[4px] resize-none focus:outline-none focus:border-accent transition-colors placeholder:text-muted font-sans disabled:opacity-50"
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-5 h-full py-12 px-6">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 bg-accent-ai animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-secondary">
              Running AI investigation graph…
            </p>
            <p className="font-mono text-[11px] text-muted text-center">
              Fetching events · Semantic search · Synthesising report
            </p>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="border-l-2 border-sev-high px-4 py-3 bg-sev-high/10 font-mono text-[12px] text-sev-high">
              {error}
            </div>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-0 p-5">

            {/* Summary */}
            <div className="mb-6">
              <p className="kicker mb-3">AI Summary</p>
              <div className="rule mb-4" />
              <p className="text-[14px] text-primary leading-relaxed font-sans whitespace-pre-wrap">
                {result.summary}
              </p>
            </div>

            {/* Findings */}
            {result.findings?.length > 0 && (
              <div className="mb-6">
                <p className="kicker mb-3">Findings ({result.findings.length})</p>
                <div className="rule" />
                {result.findings.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3.5 border-b border-border last:border-b-0"
                  >
                    <span className="font-mono text-[11px] text-sev-med shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[13px] text-primary leading-relaxed font-sans">{f}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div>
                <p className="kicker mb-3">Recommendations</p>
                <div className="rule" />
                {result.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3.5 border-b border-border last:border-b-0"
                  >
                    <span className="font-mono text-[11px] text-accent shrink-0 mt-0.5">→</span>
                    <p className="text-[13px] text-primary leading-relaxed font-sans">{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !actor ? (
          <div className="flex flex-col gap-6 px-5 py-8">
            <div>
              <p className="kicker mb-3">How it works</p>
              <div className="rule mb-4" />
              <p className="text-[13px] text-secondary leading-relaxed font-sans">
                Select a detection and click AI Investigate. The LangGraph agent retrieves,
                correlates, and reasons across the actor's entire audit history — producing
                a structured report in seconds.
              </p>
            </div>

            <div>
              <p className="kicker mb-3">Example queries</p>
              <div className="rule" />
              {[
                'Summarise all activities for this actor in the last 24 hours.',
                'Why did this actor trigger a MULTIPLE_FAILED_LOGINS detection?',
                'Analyse the data export volume and identify any anomalies.',
              ].map((q, i) => (
                <div
                  key={i}
                  className="py-3 border-b border-border last:border-b-0 font-mono text-[12px] text-secondary italic"
                >
                  "{q}"
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={handleInvestigate}
          disabled={!actor || loading || !query.trim()}
          className="w-full flex items-center justify-center gap-2 border border-accent-ai/40 bg-accent-ai/10 text-accent-ai rounded-[4px] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-accent-ai/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="w-1.5 h-1.5 bg-accent-ai" />
          {loading ? 'Investigating…' : result ? 'Re-investigate' : 'Run Investigation'}
        </button>
      </div>
    </div>
  );
}
