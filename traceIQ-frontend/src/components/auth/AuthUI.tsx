import { useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Logo } from '../shared/Logo';
import { cn } from '@/lib/utils';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400';

export const authPrimaryBtn = cn(
  'w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-white text-[15px] font-medium text-black',
  'hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed', focusRing,
);

export const authSecondaryBtn = cn(
  'w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-[14px] font-medium text-zinc-200',
  'hover:bg-white/[0.08] transition', focusRing,
);

const inputCls =
  'w-full h-[42px] rounded-lg border border-white/10 bg-[#0a0a0d] px-3.5 text-[14px] text-white placeholder:text-zinc-600 ' +
  'focus:outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 transition';

/** Centered auth screen: logo, heading, a glass card for the form, and an optional footer line. */
export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] font-sans text-white flex flex-col items-center justify-center px-5 py-12">
      <div className="aurora opacity-50" aria-hidden="true" />
      <div className="relative w-full max-w-[400px] reveal-up">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="font-sans mt-8 text-center text-[26px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-center text-[14px] text-zinc-400">{subtitle}</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0f0f13]/80 backdrop-blur-xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-[14px] text-zinc-400">{footer}</p>}
      </div>
    </div>
  );
}

/** Label + input pair used by every auth form. */
export function AuthField({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-zinc-300">{label}</span>
      <input {...props} className={inputCls} />
      {hint && <span className="text-[12px] text-zinc-500">{hint}</span>}
    </label>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-zinc-300">{label}</span>
      <span className="relative">
        <input {...props} type={visible ? 'text' : 'password'} className={cn(inputCls, 'pr-10')} />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 rounded', focusRing)}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </span>
      {hint && <span className="text-[12px] text-zinc-500">{hint}</span>}
    </label>
  );
}

/** Error message shown above a form. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
      {children}
    </div>
  );
}
