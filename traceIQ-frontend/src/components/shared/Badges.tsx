import { cn } from '@/lib/utils';

const severityStyles: Record<string, string> = {
  HIGH:   'bg-sev-high/10 text-sev-high',
  MEDIUM: 'bg-sev-med/10  text-sev-med',
  LOW:    'bg-sev-low/10  text-sev-low',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide',
      severityStyles[severity] ?? 'bg-border/30 text-secondary'
    )}>
      {severity}
    </span>
  );
}

export function ActionBadge({ action }: { action: string }) {
  const isDanger =
    action.includes('FAILED') ||
    action.includes('DELETED') ||
    action.includes('DENIED') ||
    action.includes('LOCKED');

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold font-mono uppercase tracking-wide',
      isDanger ? 'bg-sev-high/10 text-sev-high' : 'bg-code/10 text-code'
    )}>
      {action}
    </span>
  );
}
