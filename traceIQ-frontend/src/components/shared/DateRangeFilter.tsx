import { cn } from '@/lib/utils';

export type DateRangeDays = 1 | 7 | 30 | null;

const PRESETS: { label: string; days: DateRangeDays }[] = [
  { label: 'All time', days: null },
  { label: '30d',      days: 30 },
  { label: '7d',       days: 7 },
  { label: '24h',      days: 1 },
];

// Converts a day count to an ISO date string for the 'from' query param.
// Returns undefined (no filter) when days is null.
export function daysToFromDate(days: DateRangeDays): string | undefined {
  if (days === null) return undefined;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface DateRangeFilterProps {
  value: DateRangeDays;
  onChange: (days: DateRangeDays) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => onChange(p.days)}
          className={cn(
            'px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] rounded-[4px] transition-colors',
            value === p.days
              ? 'bg-accent-ai/15 text-accent-ai border border-accent-ai/30'
              : 'border border-border text-muted hover:text-primary hover:border-border/80'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
