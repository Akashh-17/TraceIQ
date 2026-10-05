import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';

const SIGNUP_CAPABILITIES = [
  'Unified audit log',
  'LangGraph AI agent',
  'Automatic detections',
  'API-first ingestion',
];

const inputCls =
  'w-full bg-input border border-border text-primary text-sm px-3 py-2.5 rounded-[4px] font-sans focus:outline-none focus:border-accent transition-colors placeholder:text-secondary';

export function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [apiKey, setApiKey]           = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth  = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/signup', { companyName, email, password });
      setAuth(data.data.accessToken, data.data.user);
      setApiKey(data.data.tenant.apiKey);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  /* ── API key reveal after successful signup ─────────────────────── */
  if (apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-6">
        <div className="w-full max-w-4xl border border-border bg-surface gridlines md:grid md:grid-cols-5 animate-blur-fade-in overflow-hidden rounded-[4px]">

          {/* Left panel */}
          <div className="hidden md:flex flex-col justify-between p-10 border-r border-border col-span-2">
            <div>
              <p className="font-heading text-2xl font-medium tracking-tight text-primary">TraceIQ</p>
              <div className="rule my-6" />
              <p className="kicker mb-4">02 / Workspace Ready</p>
              <p className="text-sm text-secondary font-sans leading-relaxed">
                Your workspace is live. Save the API key shown — it will never be displayed again.
              </p>
            </div>

            <div className="space-y-2.5">
              {['Key shown once only', 'Send as a Bearer token', 'Roll it any time in settings', 'Scoped to your tenant'].map((note) => (
                <p key={note} className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                  {note}
                </p>
              ))}
            </div>

            <div className="rule--tagged">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
                Copy before continuing
              </span>
            </div>
          </div>

          {/* Right panel */}
          <div className="col-span-3 p-8 md:p-10 flex flex-col justify-center bg-surface">
            <h1 className="text-3xl font-heading font-medium tracking-tight text-primary mb-1">
              Workspace created
            </h1>
            <p className="text-secondary text-sm font-sans mb-8">
              Save your API key — it will not be shown again
            </p>

            <div className="mb-6">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary/70 block mb-2">
                Your API Key
              </label>
              <div className="bg-input border border-border rounded-[4px] px-4 py-3 font-mono text-[13px] text-primary break-all select-all leading-relaxed">
                {apiKey}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-3 leading-relaxed">
                Send it as{' '}
                <code className="text-code">Authorization: Bearer &lt;key&gt;</code>{' '}
                when sending events. Cannot be recovered — only rolled.
              </p>
            </div>

            <div className="rule mb-6" />

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-10 bg-accent text-white rounded-[4px] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to Dashboard →
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ── Signup form ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-6">
      <div className="w-full max-w-4xl border border-border bg-surface gridlines md:grid md:grid-cols-5 animate-blur-fade-in overflow-hidden rounded-[4px]">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between p-10 border-r border-border col-span-2">
          <div>
            <p className="font-heading text-2xl font-medium tracking-tight text-primary">TraceIQ</p>
            <div className="rule my-6" />
            <p className="kicker mb-4">01 / Create Workspace</p>
            <p className="text-sm text-secondary font-sans leading-relaxed">
              Set up your SOC workspace in seconds. Your API key is generated automatically on signup.
            </p>
          </div>

          <div className="space-y-2.5">
            {SIGNUP_CAPABILITIES.map((cap) => (
              <p key={cap} className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                {cap}
              </p>
            ))}
          </div>

          <div className="rule--tagged">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              Free to start
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-3 p-8 md:p-10 flex flex-col justify-center bg-surface">
          <h1 className="text-3xl font-heading font-medium tracking-tight text-primary mb-1">
            Create workspace
          </h1>
          <p className="text-secondary text-sm font-sans mb-8">
            Your API key will be generated automatically
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-sev-high/10 border border-sev-high/20 text-sev-high px-3 py-3 rounded-[4px] text-[13px]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary/70">
                Company Name
              </label>
              <input
                type="text"
                className={inputCls}
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary/70">
                Work Email
              </label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@acme.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary/70">
                Password
              </label>
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-10 bg-accent text-white rounded-[4px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating workspace…' : 'Create Workspace'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-ai hover:underline">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
