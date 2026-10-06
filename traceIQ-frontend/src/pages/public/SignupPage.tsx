import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { CopyButton } from '../../components/shared/CopyButton';
import { AuthLayout, AuthField, PasswordField, AuthError, authPrimaryBtn } from '../../components/auth/AuthUI';

export function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [apiKey, setApiKey]           = useState<string | null>(null);
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const setAuth  = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/auth/signup', { companyName, email, password });
      qc.clear();
      setAuth(data.data.accessToken, data.data.user);
      setApiKey(data.data.tenant.apiKey);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create the workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── After signup: show the API key once ────────────────────────────── */
  if (apiKey) {
    return (
      <AuthLayout title="Your workspace is ready" subtitle="Save this API key now. It won't be shown again.">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            </span>
            <p className="text-[14px] leading-snug text-zinc-300">
              Your services use this key to send events to <span className="text-white font-medium">{companyName}</span>.
            </p>
          </div>

          <div>
            <p className="text-[13px] font-medium text-zinc-300 mb-1.5">API key</p>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a0a0d] pl-3.5 pr-2 py-2.5">
              <code className="flex-1 min-w-0 break-all font-geist-mono text-[13px] text-white select-all">{apiKey}</code>
              <CopyButton text={apiKey} />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
              Send it as <code className="font-geist-mono text-zinc-300">Authorization: Bearer &lt;key&gt;</code>.
              Lost keys can't be recovered, only replaced from the Integration page.
            </p>
          </div>

          <button onClick={() => navigate('/dashboard')} className={authPrimaryBtn}>
            Go to dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  /* ── Signup form ─────────────────────────────────────────────────────── */
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="One workspace per company. You'll be its admin."
      footer={<>Already have an account? <Link to="/login" className="text-violet-300 hover:text-violet-200">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <AuthError>{error}</AuthError>}

        <AuthField label="Company name" placeholder="Acme Corp" autoComplete="organization"
          value={companyName} onChange={e => setCompanyName(e.target.value)} required minLength={2} />
        <AuthField label="Work email" type="email" placeholder="you@company.com" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <PasswordField label="Password" hint="At least 8 characters" autoComplete="new-password"
          value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />

        <button type="submit" disabled={loading} className={`${authPrimaryBtn} mt-2`}>
          {loading ? 'Creating workspace…' : <>Create workspace <ArrowRight className="w-4 h-4" aria-hidden="true" /></>}
        </button>
      </form>
    </AuthLayout>
  );
}
