import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ScrollText, ShieldAlert, Webhook, Sparkles, UserSearch, Lock } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';
import { cn } from '@/lib/utils';

const GITHUB_URL = 'https://github.com/Akashh-17/TraceIQ';

/* ── Button styles shared across the page ─────────────────────────────── */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400';
const primaryBtn = cn(
  'inline-flex items-center gap-2 h-11 px-6 rounded-full text-[15px] font-medium text-white',
  'bg-[linear-gradient(90deg,#7c4dff,#4f7cff)] shadow-[0_8px_30px_rgba(124,77,255,0.35)]',
  'hover:brightness-110 transition', focusRing,
);
const ghostBtn = cn(
  'inline-flex items-center gap-2 h-11 px-6 rounded-full text-[15px] font-medium text-white',
  'bg-white/5 border border-white/10 hover:bg-white/10 transition', focusRing,
);

/* ── Hero: a live audit stream that ends in a detection ───────────────── */

const STREAM = [
  { time: '09:41:02', actor: 'alice@finstack.com', action: 'DATA_EXPORTED', service: 'reporting' },
  { time: '09:41:05', actor: 'bob@finstack.com',   action: 'LOGIN_FAILED',  service: 'auth' },
  { time: '09:41:07', actor: 'bob@finstack.com',   action: 'LOGIN_FAILED',  service: 'auth' },
  { time: '09:41:09', actor: 'bob@finstack.com',   action: 'LOGIN_FAILED',  service: 'auth' },
  { time: '09:41:12', actor: 'bob@finstack.com',   action: 'LOGIN_FAILED',  service: 'auth' },
  { time: '09:41:14', actor: 'bob@finstack.com',   action: 'LOGIN_FAILED',  service: 'auth' },
];

const ROW_START = 0.9;  // seconds — after the headline has settled
const ROW_STEP  = 0.45;
const ALERT_AT  = ROW_START + STREAM.length * ROW_STEP + 0.2;

function StreamCard() {
  return (
    <div className="relative mx-auto mt-16 max-w-[780px] rounded-2xl border border-white/10 bg-[#0c0c10]/80 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] text-left reveal-up" style={{ animationDelay: '0.5s' }}>
      <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.07]">
        <span className="font-geist-mono text-[12px] text-zinc-500">audit-events · finstack</span>
        <span className="flex items-center gap-2 font-geist-mono text-[12px] text-zinc-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          live
        </span>
      </div>

      <div className="px-5 py-3 font-geist-mono text-[12.5px]">
        {STREAM.map((e, i) => (
          <div
            key={i}
            className="stream-in grid grid-cols-[72px_1fr_auto] sm:grid-cols-[80px_1fr_140px_80px] items-center gap-3 py-1.5"
            style={{ animationDelay: `${ROW_START + i * ROW_STEP}s` }}
          >
            <span className="text-zinc-600">{e.time}</span>
            <span className="text-sky-300 truncate">{e.actor}</span>
            <span className={e.action === 'LOGIN_FAILED' ? 'text-rose-400' : 'text-zinc-300'}>{e.action}</span>
            <span className="text-zinc-600 hidden sm:block">{e.service}</span>
          </div>
        ))}
      </div>

      <div className="mx-3 mb-3 flex flex-col gap-2">
        <div
          className="stream-in flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3"
          style={{ animationDelay: `${ALERT_AT}s` }}
        >
          <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-geist-mono text-[11px] font-medium text-rose-300">HIGH</span>
          <span className="font-geist-mono text-[12.5px] text-white">MULTIPLE_FAILED_LOGINS</span>
          <span className="text-[13px] text-zinc-400">bob@finstack.com · 5 failures in 9s · webhook sent</span>
        </div>
        <div
          className="stream-in flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] px-4 py-3"
          style={{ animationDelay: `${ALERT_AT + 0.7}s` }}
        >
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-violet-300" aria-hidden="true" />
          <p className="text-[13.5px] leading-relaxed text-zinc-300">
            Five failed logins from one external IP in 9 seconds, with no successful login after.
            Looks like password guessing against bob's account.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── How it works: the real order of the pipeline ─────────────────────── */

const STEPS = [
  { title: 'Send',        text: 'Your services POST each action to the TraceIQ API with an API key. It\'s accepted immediately and processed in the background.' },
  { title: 'Detect',      text: 'Every event is checked against detection rules as it arrives. A match becomes an alert and fires your webhook.' },
  { title: 'Investigate', text: 'Open the person\'s timeline, or ask the AI investigator what happened. It reads their real history and writes a report.' },
];

/* ── Features ──────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: ScrollText,  title: 'A searchable activity log', text: 'Filter every event by person, action and time range, open any event for full detail, and export what you find to CSV.' },
  { icon: ShieldAlert, title: 'Detections as it happens',  text: 'Repeated failed logins, unusually large data exports and admin activity at night are flagged the moment they arrive.' },
  { icon: Webhook,     title: 'Alerts where you work',      text: 'Each detection is posted to your webhook, so it can land in Slack, PagerDuty or your own tooling.' },
  { icon: Sparkles,    title: 'AI investigations',          text: 'Ask a question about someone\'s behaviour. The agent searches their history and returns findings and next steps.' },
  { icon: UserSearch,  title: 'Timelines for every person', text: 'See one person\'s activity, the services they touched and what they do most, on a single page.' },
  { icon: Lock,        title: 'Separate by design',         text: 'Each company\'s data is isolated on every query, and five roles decide who can see and change what.' },
];

/* ── Code sample: the real ingestion request ──────────────────────────── */

function CodeCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c10]/80 overflow-hidden">
      <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.07]">
        <span className="font-geist-mono text-[12px] text-zinc-500">send-event.sh</span>
        <span className="font-geist-mono text-[12px] text-emerald-400">202 Accepted</span>
      </div>
      <pre className="px-5 py-4 overflow-x-auto font-geist-mono text-[12.5px] leading-[1.75] text-zinc-300">
{`curl -X POST `}<span className="text-sky-300">http://localhost:3000/api/v1/events</span>{` \\
  -H `}<span className="text-amber-200">"Authorization: Bearer tk_live_…"</span>{` \\
  -H `}<span className="text-amber-200">"Content-Type: application/json"</span>{` \\
  -d '{
    `}<span className="text-violet-300">"actor"</span>{`: `}<span className="text-amber-200">"bob@finstack.com"</span>{`,
    `}<span className="text-violet-300">"action"</span>{`: `}<span className="text-amber-200">"LOGIN_FAILED"</span>{`,
    `}<span className="text-violet-300">"source_service"</span>{`: `}<span className="text-amber-200">"AUTH_SERVICE"</span>{`,
    `}<span className="text-violet-300">"resource_type"</span>{`: `}<span className="text-amber-200">"session"</span>{`,
    `}<span className="text-violet-300">"resource_id"</span>{`: `}<span className="text-amber-200">"sess_8842"</span>{`
  }'`}
      </pre>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const navigate = useNavigate();
  const goSignup = () => navigate('/signup');
  const goDemo   = () => navigate('/login', { state: { demo: true } });

  return (
    <div className="min-h-screen bg-[#050507] text-white font-sans scroll-smooth">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <nav className="max-w-[1160px] mx-auto h-16 px-5 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-[14px] text-zinc-400">
            <a href="#how" className="text-zinc-400 hover:text-white hover:no-underline transition-colors">How it works</a>
            <a href="#features" className="text-zinc-400 hover:text-white hover:no-underline transition-colors">Features</a>
            <a href="#api" className="text-zinc-400 hover:text-white hover:no-underline transition-colors">API</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate('/login')} className={cn('text-[14px] text-zinc-300 hover:text-white transition-colors px-2', focusRing)}>
              Sign in
            </button>
            <button onClick={goSignup} className={cn('h-9 px-4 rounded-full text-[14px] font-medium text-white border border-violet-400/50 hover:bg-violet-500/10 transition', focusRing)}>
              Get started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-24 px-5">
        {/* Glow behind the headline, plus the drifting aurora lower down behind the stream */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(124,77,255,0.28),transparent_70%)]" />
        <div className="aurora" aria-hidden="true" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_75%,#050507_100%)]" />

        <div className="relative max-w-[900px] mx-auto text-center">
          <p className="reveal-up inline-flex items-center rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1 text-[13px] text-violet-200">
            Audit logging with threat detection built in
          </p>

          <h1 className="reveal-up font-sans mt-6 text-[clamp(40px,7.5vw,78px)] font-extrabold leading-[1.02] tracking-[-0.045em]" style={{ animationDelay: '0.1s' }}>
            <span className="text-white">Every action, recorded.</span>
            <br />
            <span className="bg-[linear-gradient(90deg,#c4b5fd_0%,#8b7cff_45%,#60a5fa_100%)] bg-clip-text text-transparent">
              Every threat, explained.
            </span>
          </h1>

          <p className="reveal-up mx-auto mt-6 max-w-[600px] text-balance text-[18px] leading-relaxed text-zinc-400" style={{ animationDelay: '0.2s' }}>
            Send audit events from your services. TraceIQ stores them, flags suspicious
            behaviour the moment it happens, and explains what a person did.
          </p>

          <div className="reveal-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '0.3s' }}>
            <button onClick={goSignup} className={primaryBtn}>
              Create a workspace <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={goDemo} className={ghostBtn}>
              Try the demo
            </button>
          </div>

          <StreamCard />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 px-5 py-24 border-t border-white/[0.06]">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-300">How it works</p>
          <h2 className="font-sans mt-3 max-w-[640px] text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
            From a single request to a full investigation
          </h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-white/[0.08] bg-[#0f0f13]/70 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-geist-mono text-[13px] text-zinc-300">
                  {i + 1}
                </span>
                <h3 className="font-sans mt-5 text-[20px] font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-5 py-24 border-t border-white/[0.06]">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-300">Features</p>
          <h2 className="font-sans mt-3 max-w-[640px] text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
            Everything you need to answer “who did what?”
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-white/[0.08] bg-[#0f0f13]/70 p-6 transition-colors hover:border-violet-400/30">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-violet-300 group-hover:text-violet-200">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="font-sans mt-5 text-[18px] font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api" className="scroll-mt-20 px-5 py-24 border-t border-white/[0.06]">
        <div className="max-w-[1160px] mx-auto grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-300">API</p>
            <h2 className="font-sans mt-3 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              One request to start logging
            </h2>
            <p className="mt-5 max-w-[480px] text-[17px] leading-relaxed text-zinc-400">
              Create a workspace, copy your API key and send events from any language.
              The integration guide inside the app has ready-to-paste examples for cURL, Node.js and Python.
            </p>
            <button onClick={goSignup} className={cn(ghostBtn, 'mt-8')}>
              Get your API key <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <CodeCard />
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative overflow-hidden px-5 py-28 border-t border-white/[0.06] text-center">
        <div className="aurora opacity-60" aria-hidden="true" />
        <div className="relative max-w-[720px] mx-auto">
          <h2 className="font-sans text-[clamp(32px,5vw,52px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            See it on your own events
          </h2>
          <p className="mt-5 text-[17px] text-zinc-400">
            Set up a workspace in under a minute, or look around the demo company first.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button onClick={goSignup} className={cn('inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white text-[15px] font-medium text-black hover:bg-zinc-200 transition', focusRing)}>
              Create a workspace <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={goDemo} className={ghostBtn}>Try the demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-8">
        <div className="max-w-[1160px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-[13px] text-zinc-500">Built with Node.js, PostgreSQL, Redis and LangGraph</p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[13px] text-zinc-400 hover:text-white hover:no-underline">
            Source on GitHub <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
