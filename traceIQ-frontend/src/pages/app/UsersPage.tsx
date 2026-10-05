import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, apiKeysApi } from '../../api/users.api';
import { RelativeTime } from '../../components/shared/RelativeTime';
import { CopyButton } from '../../components/shared/CopyButton';
import { cn } from '@/lib/utils';

const ROLES = ['VIEWER', 'ANALYST', 'TENANT_ADMIN'];

const maskKey = (key: string) =>
  key ? `${key.slice(0, 8)}${'•'.repeat(24)}${key.slice(-6)}` : '—';

const fieldInputCls =
  'bg-input border border-border text-primary text-[13px] px-3 py-2 rounded-[4px] font-sans focus:outline-none focus:border-accent transition-colors placeholder:text-muted';

const monoLabelCls = 'font-mono text-[10px] uppercase tracking-[0.15em] text-secondary block mb-1.5';

export function UsersPage() {
  const qc = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.listUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]         = useState('VIEWER');
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const createUserMutation = useMutation({
    mutationFn: () => usersApi.createUser({ email: newEmail, password: newPassword, role: newRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setNewEmail('');
      setNewPassword('');
      setNewRole('VIEWER');
      setCreateFeedback({ type: 'success', msg: 'User created successfully.' });
      setTimeout(() => setCreateFeedback(null), 3000);
    },
    onError: (err: any) => {
      setCreateFeedback({ type: 'error', msg: err.response?.data?.message || 'Failed to create user.' });
    },
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeysApi.listApiKeys,
  });

  const [newKey, setNewKey] = useState<string | null>(null);
  const rollKeyMutation = useMutation({
    mutationFn: apiKeysApi.rollApiKey,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
      setNewKey(data.plainKey);
    },
  });

  return (
    <div className="flex flex-col gap-10 animate-blur-fade-in">

      {/* Page header */}
      <div>
        <p className="kicker mb-3">06 / Access Control</p>
        <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
          Users &amp; Access
        </h1>
      </div>

      {/* ── Team Members ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-end justify-between pb-4">
          <div>
            <p className="kicker mb-1">01 / Team Members</p>
            <p className="text-[13px] text-secondary font-sans">
              Manage user roles for this tenant.
            </p>
          </div>
        </div>
        <div className="rule" />

        {/* Users table */}
        <div className="overflow-x-auto">
          {usersLoading ? (
            <p className="kicker py-6">Loading users…</p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {['Email', 'Role', 'Created'].map(h => (
                    <th
                      key={h}
                      className="px-0 pr-8 py-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u: any) => (
                  <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-elevated/30 transition-colors">
                    <td className="py-3.5 pr-8 font-mono text-[13px] text-code">{u.email}</td>
                    <td className="py-3.5 pr-8">
                      <select
                        className="bg-input border border-border text-primary text-[11px] px-2 py-1.5 rounded-[4px] font-mono uppercase tracking-[0.08em] focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                        value={u.role}
                        onChange={e => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                        disabled={updateRoleMutation.isPending}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-3.5 font-mono text-[12px] text-secondary">
                      <RelativeTime date={u.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create user form */}
        <div className="flex flex-wrap items-end gap-4 py-5 border-t border-border mt-0">
          <div>
            <label className={monoLabelCls}>Email</label>
            <input
              type="email"
              placeholder="user@acme.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className={`w-60 ${fieldInputCls}`}
            />
          </div>
          <div>
            <label className={monoLabelCls}>Password</label>
            <input
              type="password"
              placeholder="Temporary password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={`w-48 ${fieldInputCls}`}
            />
          </div>
          <div>
            <label className={monoLabelCls}>Role</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className={fieldInputCls}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={() => createUserMutation.mutate()}
            disabled={!newEmail || !newPassword || createUserMutation.isPending}
            className="h-9 px-4 bg-accent text-white font-mono text-[10px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add User
          </button>
        </div>

        {createFeedback && (
          <div
            className={cn(
              'py-2.5 font-mono text-[12px] border-t border-border',
              createFeedback.type === 'success' ? 'text-status-resolved' : 'text-sev-high'
            )}
          >
            {createFeedback.msg}
          </div>
        )}
      </div>

      {/* ── API Keys ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-end justify-between pb-4">
          <div>
            <p className="kicker mb-1">02 / API Keys</p>
            <p className="text-[13px] text-secondary font-sans">
              Keys used by services to ingest events into TraceIQ.
            </p>
          </div>
          <button
            onClick={() => rollKeyMutation.mutate()}
            disabled={rollKeyMutation.isPending}
            className="h-8 px-4 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-[4px]"
          >
            Roll Key →
          </button>
        </div>
        <div className="rule" />

        {/* New key reveal — one-time */}
        {newKey && (
          <div className="py-4 border-b border-border">
            <div className="rule--tagged mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-status-resolved">
                New Key — Copy Now
              </span>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-[12px] text-primary bg-input border border-border px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 rounded-[4px]">
                {newKey}
              </code>
              <CopyButton text={newKey} />
              <button
                onClick={() => setNewKey(null)}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {keysLoading ? (
          <p className="kicker py-6">Loading keys…</p>
        ) : (
          (apiKeys || []).map((k: any) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-b-0"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5', k.isActive ? 'bg-status-resolved' : 'bg-muted')} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-secondary">
                    {k.isActive ? 'Active Key' : 'Revoked Key'}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-primary bg-input border border-border px-2 py-1 rounded-[4px] tracking-wide">
                  {maskKey(k.keyPrefix || k.id)}
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted shrink-0">
                <RelativeTime date={k.createdAt} />
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

