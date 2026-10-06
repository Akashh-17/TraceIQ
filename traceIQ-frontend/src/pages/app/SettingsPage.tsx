import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { webhookApi } from '../../api/webhook.api';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full bg-input border border-border text-primary px-3 py-2 rounded-[4px] text-sm font-sans focus:outline-none focus:border-accent transition-colors placeholder:text-muted';

const monoLabelCls = 'font-mono text-[10px] uppercase tracking-[0.15em] text-secondary block mb-1.5';

const ABOUT_ROWS = [
  { label: 'Version',      value: '1.0.0-beta' },
  { label: 'Architecture', value: 'Multi-tenant SaaS, JWT + API Key auth' },
  { label: 'AI Engine',    value: 'LangGraph + Google Gemini' },
  { label: 'Backend',      value: 'Node.js · TypeScript · Prisma · PostgreSQL' },
  { label: 'Frontend',     value: 'React · Vite · TanStack Query' },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(state => state.user);
  // Webhook settings are admin-only on the API, so non-admins don't see the section.
  const isAdmin = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN';

  // ── Password change state ────────────────────────────────────────
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Webhook state ────────────────────────────────────────────────
  const [webhookInput, setWebhookInput] = useState('');
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: webhookConfig } = useQuery({
    queryKey: ['webhookConfig'],
    queryFn: webhookApi.getConfig,
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: () => webhookApi.upsert(webhookInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhookConfig'] });
      setWebhookInput('');
      setWebhookFeedback({ type: 'success', msg: 'Webhook URL saved.' });
    },
    onError: (err: any) => {
      setWebhookFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to save.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: webhookApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhookConfig'] });
      setWebhookFeedback({ type: 'success', msg: 'Webhook removed.' });
    },
  });

  const testMutation = useMutation({
    mutationFn: webhookApi.sendTest,
    onSuccess: (data) => {
      setWebhookFeedback({ type: 'success', msg: `Test delivered — endpoint returned ${data.status}.` });
    },
    onError: (err: any) => {
      setWebhookFeedback({ type: 'error', msg: err.response?.data?.message || 'Test delivery failed.' });
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await api.post('/api/v1/auth/change-password', { currentPassword, newPassword });
      setFeedback({ type: 'success', msg: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 max-w-[800px] animate-blur-fade-in">

      {/* Page header */}
      <div>
        <p className="kicker mb-3">07 / Configuration</p>
        <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
          Settings
        </h1>
      </div>

      {/* ── 01 / Profile ──────────────────────────────────────────── */}
      <div>
        <p className="kicker mb-4">01 / Profile</p>
        <div className="rule mb-6" />

        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 border border-border bg-elevated font-heading text-2xl font-medium text-primary shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-mono text-[14px] text-primary">{user?.email}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* ── 02 / Security ─────────────────────────────────────────── */}
      <div>
        <p className="kicker mb-4">02 / Security</p>
        <div className="rule mb-6" />

        <form onSubmit={handleChangePassword} className="flex flex-col gap-5 max-w-[400px]">
          {[
            { label: 'Current Password',     value: currentPassword,  onChange: setCurrentPassword,  placeholder: '••••••••' },
            { label: 'New Password',         value: newPassword,      onChange: setNewPassword,      placeholder: 'Min 8 characters' },
            { label: 'Confirm New Password', value: confirmPassword,  onChange: setConfirmPassword,  placeholder: 'Repeat new password' },
          ].map(f => (
            <div key={f.label}>
              <label className={monoLabelCls}>{f.label}</label>
              <input
                type="password"
                className={inputCls}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                required
              />
            </div>
          ))}

          {feedback && (
            <p
              className={cn(
                'font-mono text-[12px] pt-1',
                feedback.type === 'success' ? 'text-status-resolved' : 'text-sev-high'
              )}
            >
              {feedback.msg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="self-start h-9 px-5 bg-accent text-white font-mono text-[10px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* 03 / Webhook Notifications */}
      {isAdmin && (
      <div>
        <p className="kicker mb-4">03 / Webhook Notifications</p>
        <div className="rule mb-6" />

        <p className="text-[13px] text-secondary font-sans mb-6 max-w-[520px] leading-relaxed">
          When a detection fires, TraceIQ POSTs the payload to this URL.
          Use it to connect Slack, PagerDuty, or any custom alerting endpoint.
        </p>

        {webhookConfig && (
          <div className="flex items-center gap-3 mb-5 py-3 border-b border-border">
            <span className="w-1.5 h-1.5 bg-status-resolved shrink-0" />
            <span className="font-mono text-[12px] text-primary flex-1 truncate">{webhookConfig.url}</span>
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ai hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {testMutation.isPending ? 'Sending…' : 'Test →'}
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-sev-high transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex items-end gap-3 max-w-[520px]">
          <div className="flex-1">
            <label className={monoLabelCls}>{webhookConfig ? 'Update URL' : 'Webhook URL'}</label>
            <input
              type="url"
              className={inputCls}
              value={webhookInput}
              onChange={e => setWebhookInput(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!webhookInput || saveMutation.isPending}
            className="h-9 px-5 bg-accent text-white font-mono text-[10px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {webhookFeedback && (
          <p className={cn(
            'font-mono text-[12px] mt-3',
            webhookFeedback.type === 'success' ? 'text-status-resolved' : 'text-sev-high'
          )}>
            {webhookFeedback.msg}
          </p>
        )}
      </div>
      )}

      {/* 04 / About */}
      <div>
        <p className="kicker mb-5">{isAdmin ? '04' : '03'} / About</p>
        <div className="rule mb-0" />

        {ABOUT_ROWS.map(row => (
          <div
            key={row.label}
            className="flex gap-6 py-3.5 border-b border-border last:border-b-0"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted w-36 shrink-0 pt-0.5">
              {row.label}
            </span>
            <span className="text-[13px] text-primary font-sans">{row.value}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

