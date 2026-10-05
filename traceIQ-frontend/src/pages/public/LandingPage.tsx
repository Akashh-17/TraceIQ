import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ── Static data ──────────────────────────────────────────────────────── */

const PAIN_POINTS = [
  { problem: 'Logs scattered across 5 different services',        solution: 'Unified audit trail with a single query interface' },
  { problem: 'Security alerts with no context or explanation',    solution: 'Every detection links back to full event chains' },
  { problem: 'AI investigation takes days of manual analysis',    solution: 'LangGraph AI analysis completes in under 30 seconds' },
  { problem: 'No way to prove compliance to auditors',            solution: 'Immutable, tamper-proof event log with NL explanations' },
];

const STEPS = [
  { num: '01', title: 'Connect',     desc: 'Send audit events from any service via a single HTTP POST to the TraceIQ ingestion API.' },
  { num: '02', title: 'Detect',      desc: 'Rules run automatically on every ingested event. Alerts are created in real-time with severity classification.' },
  { num: '03', title: 'Investigate', desc: 'AI graphs retrieve, correlate, and reason across your audit history to produce a structured report in seconds.' },
];

const HERO_TAGS = ['Real-time Detection', 'AI Investigation', 'Multi-tenant', 'API-First'];

/* ── Sub-components ───────────────────────────────────────────────────── */

const LiveDetectionCard = () => (
  <div className="border border-border bg-surface p-5 animate-blur-fade-in">
    {/* Card header */}
    <div className="flex items-center gap-2.5 mb-4">
      <p className="kicker flex-1">Live / Detection Engine</p>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full bg-sev-high opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 bg-sev-high" />
      </span>
    </div>

    <div className="rule mb-4" />

    {/* Incoming event */}
    <div className="flex flex-col gap-2 mb-4">
      {[
        { label: 'ACTOR',   value: 'admin@acme.com',  cls: 'text-code' },
        { label: 'ACTION',  value: 'DATA_EXPORTED',   cls: 'text-sev-med' },
        { label: 'SERVICE', value: 'PAYMENTS_SVC',    cls: 'text-primary' },
        { label: 'RECORDS', value: '5,000',           cls: 'text-primary' },
      ].map(row => (
        <div key={row.label} className="flex gap-3 font-mono text-[12px]">
          <span className="text-muted w-16 shrink-0 tracking-widest">{row.label}</span>
          <span className={row.cls}>{row.value}</span>
        </div>
      ))}
    </div>

    <div className="rule mb-4" />

    {/* Detection output */}
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-sev-high shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-sev-high">
          Detection Triggered
        </span>
      </div>
      <p className="font-mono text-[12px] text-primary pl-3.5">BULK_DATA_EXPORT (HIGH)</p>

      <div className="flex items-center gap-2 mt-1">
        <span className="w-1.5 h-1.5 bg-accent-ai shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-ai">
          AI Investigation Available
        </span>
      </div>
      <p className="font-mono text-[11px] text-secondary pl-3.5">
        LangGraph agent ready to investigate
      </p>
    </div>
  </div>
);

const AuditLogPreview = () => (
  <div className="flex flex-col gap-0">
    {[
      { time: '09:12', actor: 'admin@acme.com', action: 'DATA_EXPORTED',  svc: 'PAYMENTS', danger: true  },
      { time: '09:10', actor: 'user@acme.com',  action: 'LOGIN_FAILED',   svc: 'AUTH',     danger: true  },
      { time: '09:08', actor: 'dev@acme.com',   action: 'CONFIG_CHANGED', svc: 'INFRA',    danger: false },
      { time: '09:05', actor: 'admin@acme.com', action: 'USER_CREATED',   svc: 'IAM',      danger: false },
    ].map((r, i) => (
      <div key={i} className="flex gap-4 items-center py-2.5 border-b border-border last:border-b-0 text-[12px]">
        <span className="font-mono text-muted w-10 shrink-0">{r.time}</span>
        <span className="font-mono text-code flex-1 truncate">{r.actor}</span>
        <span className={cn(
          'font-mono text-[11px] font-medium px-2 py-0.5 shrink-0',
          r.danger ? 'bg-sev-high/10 text-sev-high' : 'bg-code/10 text-code'
        )}>
          {r.action}
        </span>
        <span className="font-mono text-[11px] text-muted shrink-0">{r.svc}</span>
      </div>
    ))}
  </div>
);

const DetectionsPreview = () => (
  <div className="flex flex-col gap-0">
    {[
      { sev: 'HIGH',   rule: 'MULTIPLE_FAILED_LOGINS', actor: 'user@acme.com',  status: 'OPEN',         dotCls: 'bg-sev-high',  statusCls: 'text-sev-high'           },
      { sev: 'MEDIUM', rule: 'BULK_DATA_EXPORT',        actor: 'admin@acme.com', status: 'ACKNOWLEDGED', dotCls: 'bg-sev-med',   statusCls: 'text-status-ack'         },
      { sev: 'LOW',    rule: 'OFF_HOURS_ACCESS',        actor: 'dev@acme.com',   status: 'RESOLVED',     dotCls: 'bg-sev-low',   statusCls: 'text-status-resolved'    },
    ].map((d, i) => (
      <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
        <span className={cn('w-1.5 h-1.5 shrink-0', d.dotCls)} />
        <span className="font-mono text-[12px] text-primary flex-1 truncate">{d.rule}</span>
        <span className="font-mono text-[11px] text-code shrink-0 hidden sm:block">{d.actor}</span>
        <span className={cn('font-mono text-[10px] uppercase tracking-[0.1em] shrink-0', d.statusCls)}>
          {d.status}
        </span>
      </div>
    ))}
  </div>
);

const AIInvestigationPreview = () => (
  <div className="flex flex-col gap-4">
    <div className="border border-border border-l-2 border-l-accent-ai px-4 py-3 font-sans text-[14px] italic text-secondary leading-relaxed">
      "Why was admin@acme.com flagged last night?"
    </div>
    <div className="flex flex-col gap-2">
      {['Searching detections', 'Retrieving audit timeline', 'Running semantic search', 'Generating report'].map((s, i) => (
        <div key={i} className="flex items-center gap-2.5 font-mono text-[11px]">
          <span className="text-status-resolved">✓</span>
          <span className="text-secondary uppercase tracking-[0.08em]">{s}</span>
        </div>
      ))}
    </div>
    <div className="border border-border px-4 py-3 flex flex-col gap-2">
      <p className="text-[13px] text-primary leading-relaxed font-sans">
        Actor exported 5,000 transaction records outside of normal business hours across 2 services.
      </p>
      <div className="flex items-center gap-4 font-mono text-[11px] text-secondary pt-2 border-t border-border">
        <span><strong className="text-sev-med">3</strong> findings</span>
        <span className="text-muted">·</span>
        <span><strong className="text-accent">2</strong> recommendations</span>
      </div>
    </div>
  </div>
);

const FEATURE_TABS = [
  { label: 'Audit Log',        preview: <AuditLogPreview /> },
  { label: 'Detections',       preview: <DetectionsPreview /> },
  { label: 'AI Investigation', preview: <AIInvestigationPreview /> },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const navigate   = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-base text-primary">

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-8 bg-base/90 backdrop-blur-md border-b border-border z-50">
        <span className="font-heading text-xl font-medium tracking-tight text-primary">
          Trace<span className="text-accent-ai">IQ</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary hover:border-primary/30 transition-colors rounded-[4px]"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-1.5 bg-accent text-white font-mono text-[10px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity"
          >
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="rules-band border-b border-border pt-14 relative overflow-hidden">
        {/* Hero ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 20% 50%, rgba(163, 113, 247, 0.08) 0%, transparent 65%)' }}
        />
        <div className="max-w-[1100px] mx-auto px-6 py-20 lg:py-28 relative z-[1]">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">

            {/* Left */}
            <div className="lg:col-span-7 mb-12 lg:mb-0">
              <p className="kicker mb-5">Audit Intelligence Platform</p>
              <h1 className="text-gradient font-heading font-medium text-[clamp(36px,5vw,58px)] leading-[1.06] tracking-tight mb-5">
                Every Action.<br />
                Every Actor.<br />
                Fully Explained.
              </h1>
              <p className="text-[16px] leading-[1.75] text-secondary font-sans max-w-[480px] mb-8">
                TraceIQ ingests audit events from all your services, detects threats in real-time,
                and lets an AI agent investigate suspicious actors in seconds — not days.
              </p>
              <div className="flex items-center gap-3 flex-wrap mb-8">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-6 py-2.5 bg-accent text-white font-mono text-[11px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity"
                >
                  Create Workspace →
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 border border-border font-mono text-[11px] uppercase tracking-[0.15em] text-secondary hover:text-primary hover:border-primary/30 transition-colors rounded-[4px]"
                >
                  Sign In
                </button>
              </div>

              {/* Tag strip */}
              <div className="flex items-center flex-wrap border-t border-border pt-6 gap-y-2">
                {HERO_TAGS.map((tag, i) => (
                  <span key={tag} className="flex items-center">
                    {i > 0 && <span className="mx-3 text-border select-none">·</span>}
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{tag}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Live detection card */}
            <div className="lg:col-span-5">
              <LiveDetectionCard />
            </div>

          </div>
        </div>
      </section>

      {/* ── Why TraceIQ ─────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 py-20">
          <p className="kicker mb-6">02 / The Problem</p>
          <div className="rule mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-12">
            {/* Problems */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-sev-high mb-4">
                What teams are dealing with
              </p>
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className="flex gap-3 py-3.5 border-b border-border last:border-b-0">
                  <span className="text-sev-high font-mono text-[11px] shrink-0 mt-0.5">✗</span>
                  <p className="text-[14px] text-secondary leading-relaxed font-sans">{p.problem}</p>
                </div>
              ))}
            </div>

            {/* Solutions */}
            <div className="mt-10 md:mt-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-status-resolved mb-4">
                What TraceIQ provides
              </p>
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className="flex gap-3 py-3.5 border-b border-border last:border-b-0">
                  <span className="text-status-resolved font-mono text-[11px] shrink-0 mt-0.5">✓</span>
                  <p className="text-[14px] text-primary leading-relaxed font-sans">{p.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 py-20">
          <p className="kicker mb-6">03 / How It Works</p>
          <div className="rule mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                <p className="font-heading text-[72px] font-medium leading-none text-primary/8 mb-4 select-none">
                  {s.num}
                </p>
                <h3 className="font-heading text-2xl font-medium text-primary mb-3">{s.title}</h3>
                <p className="text-[14px] leading-[1.75] text-secondary font-sans">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Preview ─────────────────────────────────────────── */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 py-20">
          <p className="kicker mb-6">04 / See It In Action</p>
          <div className="rule mb-8" />

          {/* Tab bar */}
          <div className="flex gap-0 border-b border-border mb-0">
            {FEATURE_TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-5 py-3 font-mono text-[10px] uppercase tracking-[0.15em] border-b-2 -mb-px transition-colors',
                  activeTab === i
                    ? 'text-primary border-accent-ai'
                    : 'text-secondary border-transparent hover:text-primary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Preview panel */}
          <div className="border border-t-0 border-border p-6 min-h-[220px]">
            {FEATURE_TABS[activeTab].preview}
          </div>
        </div>
      </section>

      {/* ── CTA Footer ──────────────────────────────────────────────── */}
      <section className="rules-band border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 py-24 text-center">
          <p className="kicker mb-8 justify-center flex">05 / Get Started</p>
          <h2 className="font-heading text-[clamp(28px,4vw,48px)] font-medium text-primary leading-tight mb-4">
            Ready to see everything?
          </h2>
          <p className="text-secondary text-[15px] font-sans mb-10 max-w-[440px] mx-auto leading-relaxed">
            Create your TraceIQ workspace in seconds and start investigating.
          </p>
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 bg-accent text-white font-mono text-[11px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity"
            >
              Create Workspace →
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 border border-border font-mono text-[11px] uppercase tracking-[0.15em] text-secondary hover:text-primary hover:border-primary/30 transition-colors rounded-[4px]"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1100px] mx-auto px-6 py-8 flex items-center justify-between">
        <span className="font-heading text-sm text-muted">TraceIQ</span>
        <div className="rule--tagged flex-1 mx-8">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
            Audit Intelligence Platform
          </span>
        </div>
      </footer>

    </div>
  );
}
