import { useState, useEffect } from 'react';
import { Activity, LayoutDashboard, ScrollText, Sparkles, ArrowRight, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { cn } from '@/lib/utils';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Activity,
    title: 'Welcome to TraceIQ',
    description:
      'Every action your services report lands here. TraceIQ stores it, checks it for suspicious behaviour, and keeps it ready for investigation.',
  },
  {
    icon: LayoutDashboard,
    title: 'Your dashboard',
    description:
      'See event volume, detection trends and your most active people at a glance. The live feed on the right refreshes every few seconds.',
  },
  {
    icon: ScrollText,
    title: 'The audit log',
    description:
      'Filter events by person, action or time range and export them to CSV. Open any event to see its details, a plain-English summary and related activity.',
  },
  {
    icon: Sparkles,
    title: 'AI investigations',
    description:
      'On the Detections page, click any alert to open the AI investigator. It searches that person\'s history and writes a report with findings and next steps.',
  },
];

export function OnboardingWizard() {
  const user    = useAuthStore(state => state.user);
  const token   = useAuthStore(state => state.token);
  const setAuth = useAuthStore(state => state.setAuth);
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = () => {
    setVisible(false);
    api.patch('/api/v1/users/me/onboarding').catch(() => {});
    if (user && token) {
      setAuth(token, { ...user, hasCompletedOnboarding: true });
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[900]" onClick={handleDone} />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[901] w-[440px] max-w-[90vw] rounded-2xl border border-white/10 bg-[#0f0f13]/95 font-sans shadow-[0_30px_80px_rgba(0,0,0,0.6)] animate-blur-fade-in"
      >
        {/* Progress */}
        <div className="flex gap-1.5 px-6 pt-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-violet-400' : 'bg-white/10')}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 pt-7 pb-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-[12px] font-medium text-zinc-500">Step {step + 1} of {STEPS.length}</p>
          <h2 id="onboarding-title" className="font-sans mt-1 text-[22px] font-bold tracking-tight text-white">
            {current.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] px-6 py-4">
          <button onClick={handleDone} className="text-[14px] text-zinc-500 hover:text-zinc-300 transition-colors">
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-white text-[14px] font-medium text-black hover:bg-zinc-200 transition"
          >
            {isLast ? 'Start exploring' : 'Next'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
