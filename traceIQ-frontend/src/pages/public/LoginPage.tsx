import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { AuthLayout, AuthField, PasswordField, AuthError, authPrimaryBtn, authSecondaryBtn } from '../../components/auth/AuthUI';

// Seeded demo company (see traceIQ-backend/prisma/seed.ts)
const DEMO_EMAIL    = 'admin@finstack.com';
const DEMO_PASSWORD = 'password123';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc       = useQueryClient();
  const setAuth  = useAuthStore(state => state.setAuth);

  // "Try the demo" on the landing page arrives here with the demo account pre-filled.
  const cameForDemo = Boolean((location.state as { demo?: boolean } | null)?.demo);
  const [email, setEmail]       = useState(cameForDemo ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(cameForDemo ? DEMO_PASSWORD : '');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
      setError(err.response?.data?.message || 'Could not sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your TraceIQ workspace"
      footer={<>New to TraceIQ? <Link to="/signup" className="text-violet-300 hover:text-violet-200">Create a workspace</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <AuthError>{error}</AuthError>}
        {cameForDemo && !error && (
          <p className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3.5 py-2.5 text-[13px] text-violet-200">
            Demo account filled in. Press Sign in to explore the FinStack workspace.
          </p>
        )}

        <AuthField label="Email" type="email" placeholder="you@company.com" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <PasswordField label="Password" placeholder="Your password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} required />

        <button type="submit" disabled={loading} className={`${authPrimaryBtn} mt-2`}>
          {loading ? 'Signing in…' : <>Sign in <ArrowRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>

        <div className="flex items-center gap-3 text-[12px] uppercase tracking-wider text-zinc-600" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <button type="button" onClick={fillDemo} className={authSecondaryBtn}>
          Use the demo account
        </button>
      </form>
    </AuthLayout>
  );
}
