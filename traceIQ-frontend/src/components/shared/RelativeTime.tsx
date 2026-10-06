import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

export function RelativeTime({ date }: { date: string | Date | null | undefined }) {
  const [timeStr, setTimeStr] = useState('');

  // A missing or malformed date must not crash the page — toISOString() throws on Invalid Date.
  const parsed = date ? new Date(date) : null;
  const iso = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;

  useEffect(() => {
    if (!iso) return;
    const update = () => {
      const d = new Date(iso);
      setTimeStr(`${formatDistanceToNow(d, { addSuffix: true })} · ${format(d, 'HH:mm:ss')}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!iso) return <span className="text-[13px] text-muted">—</span>;

  return (
    <span className="text-[13px] text-secondary" title={iso}>
      {timeStr}
    </span>
  );
}
