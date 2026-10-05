import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
}

export function KpiCard({ title, value, subtitle, trend }: KpiCardProps) {
  const isPositiveTrend = trend?.startsWith('+');

  return (
    <div className="pt-5 group">
      <div className="h-px mb-5 bg-border group-hover:bg-accent-ai/40 transition-colors duration-300" />
      <p className="kicker mb-4">{title}</p>
      <p className="font-mono text-[52px] tabular-nums leading-none text-gradient">
        {value}
      </p>
      {(trend || subtitle) && (
        <div className="flex items-center gap-2 mt-3 font-mono text-[11px] uppercase tracking-[0.1em]">
          {trend && (
            <span className={cn(isPositiveTrend ? 'text-sev-high' : 'text-status-resolved')}>
              {trend}
            </span>
          )}
          {subtitle && <span className="text-muted">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
