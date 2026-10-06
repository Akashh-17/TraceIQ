import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';

const LOGIN_CAPABILITIES = [
  'Real-time threat detection',
  'LangGraph AI investigation',
  'Immutable audit trail',
  'Multi-tenant isolation',
];

const inputCls =
  'w-full bg-input border border-border text-primary text-sm px-3 py-2.5 rounded-[4px] font-sans focus:outline-none focus:border-accent transition-colors placeholder:text-secondary';

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const setAuth  = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/login', { email, password });
      // A previous session may have expired without a logout; never show its cached data.
      qc.clear();
      setAuth(data.data.accessToken, data.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-6">
      <div className="w-full max-w-4xl border border-border bg-surface gridlines md:grid md:grid-cols-5 animate-blur-fade-in overflow-hidden rounded-[4px]">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between p-10 border-r border-border col-span-2">
          <div>
            <p className="font-heading text-2xl font-medium tracking-tight text-primary">TraceIQ</p>
            <div className="rule my-6" />
            <p className="kicker mb-4">01 / Sign In</p>
            <p className="text-sm text-secondary font-sans leading-relaxed">
              Secure access to your audit intelligence workspace. Investigate actors, review detections, and run AI-powered analysis.
            </p>
          </div>

          <div className="space-y-2.5">
            {LOGIN_CAPABILITIES.map((cap) => (
              <p key={cap} className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                {cap}
              </p>
            ))}
          </div>

          <div className="rule--tagged">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              Audit Intelligence Platform
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-3 p-8 md:p-10 flex flex-col justify-center bg-surface">
          <h1 className="text-3xl font-heading font-medium tracking-tight text-primary mb-1">
            Welcome back
          </h1>
          <p className="text-secondary text-sm font-sans mb-8">
            Enter your credentials to access TraceIQ
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-sev-high/10 border border-sev-high/20 text-sev-high px-3 py-3 rounded-[4px] text-[13px]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary/70">
                Email Address
              </label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@acme.com"
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
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-10 bg-accent text-white rounded-[4px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              type="button"
              className="w-full h-10 bg-transparent border border-border text-secondary rounded-[4px] font-mono text-[11px] uppercase tracking-[0.1em] hover:text-primary hover:border-primary/30 transition-colors"
              onClick={() => { setEmail('admin@finstack.com'); setPassword('password123'); }}
            >
              Try Demo Account
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-muted">
            No account?{' '}
            <Link to="/signup" className="text-accent-ai hover:underline">
              Create a workspace
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
