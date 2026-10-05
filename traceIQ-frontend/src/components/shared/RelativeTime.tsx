import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

export function RelativeTime({ date }: { date: string | Date }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const d = new Date(date);
      setTimeStr(`${formatDistanceToNow(d, { addSuffix: true })} · ${format(d, 'HH:mm:ss')}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [date]);

  return (
    <span className="text-[13px] text-secondary" title={new Date(date).toISOString()}>
      {timeStr}
    </span>
  );
}
