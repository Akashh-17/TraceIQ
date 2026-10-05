import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{payload[0].value} events</p>
    </div>
  );
};

export function EventsPerHourChart({ data }: { data: any[] }) {
  const formatted = data?.map(d => ({
    time: format(new Date(d.hour), 'HH:mm'),
    count: d.count,
  })) ?? [];

  return (
    <div className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-[280px]">
      <div className="px-4 py-3 border-b border-border-muted">
        <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wider">
          Events Per Hour (24h)
        </h3>
      </div>
      <div className="flex-1 px-2 pt-3 pb-1">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formatted} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
