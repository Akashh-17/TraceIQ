import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '../../api/users.api';
import { CopyButton } from '../../components/shared/CopyButton';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '@/lib/utils';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

type Tab = 'curl' | 'node' | 'python';

const TABS: { id: Tab; label: string }[] = [
  { id: 'curl',   label: 'cURL'      },
  { id: 'node',   label: 'Node.js'   },
  { id: 'python', label: 'Python'    },
];

function buildSnippets(apiKey: string, base: string) {
  return {
    curl: `curl -X POST ${base}/api/v1/events \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "actor": "alice@example.com",
    "action": "DATA_EXPORTED",
    "source_service": "PAYMENTS",
    "resource_type": "transaction",
    "resource_id": "txn_12345",
    "metadata": { "recordsCount": 500 }
  }'`,

    node: `const res = await fetch('${base}/api/v1/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}',
  },
  body: JSON.stringify({
    actor: 'alice@example.com',
    action: 'DATA_EXPORTED',
    source_service: 'PAYMENTS',
    resource_type: 'transaction',
    resource_id: 'txn_12345',
    metadata: { recordsCount: 500 },
  }),
});
const { data } = await res.json();
// data → { queued: true }`,

    python: `import httpx

r = httpx.post(
    '${base}/api/v1/events',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${apiKey}',
    },
    json={
        'actor': 'alice@example.com',
        'action': 'DATA_EXPORTED',
        'source_service': 'PAYMENTS',
        'resource_type': 'transaction',
        'resource_id': 'txn_12345',
        'metadata': {'recordsCount': 500},
    },
)
print(r.json())  # {'data': {'queued': True}}`,
  };
}

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/events',          desc: 'Ingest an audit event (async, returns 202)'           },
  { method: 'GET',  path: '/api/v1/events',          desc: 'Query events — ?actor= &action= &from= &limit=&cursor=' },
  { method: 'GET',  path: '/api/v1/events/export',   desc: 'Export filtered events as a CSV download'             },
  { method: 'GET',  path: '/api/v1/detections',      desc: 'List security detections — ?severity= &status='       },
  { method: 'GET',  path: '/api/v1/actors/:actor',   desc: 'Actor profile — stats, services, top actions'         },
];

const METHOD_COLOR: Record<string, string> = {
  POST: 'text-sev-low',
  GET:  'text-status-ack',
};

export function IntegrationGuidePage() {
  const qc      = useQueryClient();
  const user    = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab]   = useState<Tab>('curl');
  const [liveKey, setLiveKey]       = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);

  const { data: keyData } = useQuery({
    queryKey: ['api-keys'],
    queryFn:  apiKeysApi.listApiKeys,
    enabled:  isAdmin,
  });

  const rollMutation = useMutation({
    mutationFn: apiKeysApi.rollApiKey,
    onSuccess: (result: any) => {
      setLiveKey(result.plainKey ?? null);
      setKeyVisible(true);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  // Keys are stored hashed, so only the prefix is known; the rest is masked.
  const keyPrefix: string = keyData?.[0]?.keyPrefix ? `${keyData[0].keyPrefix}${'•'.repeat(24)}` : '—';
  const snippetKey = liveKey ?? 'YOUR_API_KEY';
  const snippets   = buildSnippets(snippetKey, BASE_URL);

  return (
    <div className="flex flex-col gap-12 animate-blur-fade-in max-w-[860px]">

      {/* ── Page header ── */}
      <div>
        <p className="kicker mb-3">05 / Integration Guide</p>
        <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
          Integration Guide
        </h1>
        <p className="mt-3 font-mono text-[13px] text-secondary leading-relaxed max-w-[540px]">
          Send audit events from any service using the TraceIQ HTTP API.
          Authenticate every request with your API key.
        </p>
      </div>

      {/* ── API Key ── */}
      <div>
        <p className="kicker mb-4">Your API Key</p>
        <div className="rule mb-4" />

        {isAdmin ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-input border border-border px-4 py-3 rounded-[4px] max-w-[520px]">
              <code className="flex-1 font-mono text-[12px] text-primary truncate">
                {liveKey && keyVisible ? liveKey : keyPrefix}
              </code>
              {liveKey && (
                <button
                  onClick={() => setKeyVisible(v => !v)}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-primary transition-colors shrink-0"
                >
                  {keyVisible ? 'Hide' : 'Reveal'}
                </button>
              )}
              {liveKey && <CopyButton text={liveKey} />}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => rollMutation.mutate()}
                disabled={rollMutation.isPending}
                className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rollMutation.isPending ? 'Rolling…' : 'Roll new key'}
              </button>
              {liveKey && (
                <p className="font-mono text-[11px] text-status-resolved">
                  New key generated — copy it now, it won't be shown again.
                </p>
              )}
            </div>

            <p className="font-mono text-[11px] text-muted">
              Send as <code className="text-secondary">Authorization: Bearer &lt;key&gt;</code> on every ingest request.
              Keep this secret — anyone with this key can write to your audit log.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-input border border-border px-4 py-3 rounded-[4px] max-w-[520px]">
            <span className="w-1.5 h-1.5 shrink-0 mt-1.5 bg-muted" />
            <p className="font-mono text-[12px] text-secondary leading-relaxed">
              API keys are managed by your workspace admin.
              Ask them to share the key so you can populate the examples below.
            </p>
          </div>
        )}
      </div>

      {/* ── Base URL ── */}
      <div>
        <p className="kicker mb-4">Base URL</p>
        <div className="rule mb-4" />
        <div className="flex items-center gap-3 bg-input border border-border px-4 py-3 rounded-[4px] max-w-[520px]">
          <code className="flex-1 font-mono text-[12px] text-primary">{BASE_URL}</code>
          <CopyButton text={BASE_URL} />
        </div>
      </div>

      {/* ── Quick Start ── */}
      <div>
        <p className="kicker mb-4">Quick Start — Ingest an Event</p>
        <div className="rule mb-0" />

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors border-b-2 -mb-px',
                activeTab === t.id
                  ? 'text-primary border-accent-ai'
                  : 'text-muted border-transparent hover:text-secondary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative bg-input border border-t-0 border-border">
          <div className="absolute top-3 right-3">
            <CopyButton text={snippets[activeTab]} />
          </div>
          <pre className="font-mono text-[12px] text-primary p-5 pr-10 overflow-x-auto leading-relaxed whitespace-pre">
            {snippets[activeTab]}
          </pre>
        </div>

        {!liveKey && (
          <p className="mt-2 font-mono text-[11px] text-muted">
            Replace <code className="text-secondary">YOUR_API_KEY</code> with your key
            {isAdmin ? ', or roll a new one above to auto-populate these examples' : ' — ask your workspace admin for it'}.
          </p>
        )}
      </div>

      {/* ── Endpoints reference ── */}
      <div>
        <p className="kicker mb-4">Endpoints Reference</p>
        <div className="rule" />
        <div className="flex flex-col">
          {ENDPOINTS.map(ep => (
            <div
              key={ep.path}
              className="flex items-start gap-4 py-4 border-b border-border last:border-b-0"
            >
              <span className={cn(
                'font-mono text-[11px] uppercase tracking-[0.12em] shrink-0 w-12',
                METHOD_COLOR[ep.method] ?? 'text-secondary'
              )}>
                {ep.method}
              </span>
              <code className="font-mono text-[12px] text-primary shrink-0 w-[260px]">
                {ep.path}
              </code>
              <span className="font-mono text-[12px] text-secondary">
                {ep.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
