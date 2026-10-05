import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { cn } from '@/lib/utils';

interface Step {
  kicker: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    kicker: 'Getting Started',
    title: 'Welcome to TraceIQ',
    description:
      "You're now connected to a real-time audit intelligence platform. Every action taken across your tenant's services will be captured, analyzed, and available for investigation.",
  },
  {
    kicker: 'Security Overview',
    title: 'The Dashboard',
    description:
      'The dashboard gives you an instant view of event volume, detection trends, and the actors with the highest activity. Counts update in real-time — no refresh needed.',
  },
  {
    kicker: 'Immutable Record',
    title: 'Audit Log',
    description:
      'The Audit Log captures every action from every service. Filter by actor, action type, or date range. Click any row to see full metadata, an AI summary, and related events.',
  },
  {
    kicker: 'AI-Powered',
    title: 'LangGraph Investigation',
    description:
      "On any detection, click AI Investigate. The LangGraph agent retrieves, correlates, and reasons across the actor's entire audit history — producing a structured report in seconds.",
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
  const stepNum = String(step + 1).padStart(2, '0');
  const totalNum = String(STEPS.length).padStart(2, '0');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[900]"
        onClick={handleDone}
      />

      {/* Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[901] w-[480px] max-w-[90vw] bg-surface border border-border rounded-[4px] animate-blur-fade-in">

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="kicker">Product Tour</p>
          <p className="font-mono text-[11px] text-muted tabular-nums">
            {stepNum} / {totalNum}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          <p className="kicker mb-4">{current.kicker}</p>
          <div className="rule mb-6" />
          <h2 className="font-heading text-3xl font-medium text-primary mb-4 leading-tight">
            {current.title}
          </h2>
          <p className="text-[14px] leading-[1.8] text-secondary font-sans">
            {current.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border gap-4">

          {/* Square progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'w-1.5 h-1.5 transition-colors',
                  i === step   ? 'bg-accent-ai'        :
                  i < step     ? 'bg-status-resolved'  :
                                 'bg-border'
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDone}
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-secondary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-accent text-white font-mono text-[10px] uppercase tracking-[0.15em] rounded-[4px] hover:opacity-90 transition-opacity"
            >
              {step < STEPS.length - 1 ? 'Next →' : "Let's go →"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
