import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', fontSize: 12, color: p.fill }}>
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function DetectionTrendChart({ data }: { data: any[] }) {
  const formatted = data?.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    HIGH: d.HIGH,
    MEDIUM: d.MEDIUM,
    LOW: d.LOW,
  })) ?? [];

  return (
    <div className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-[280px]">
      <div className="px-4 py-3 border-b border-border-muted">
        <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wider">
          Detection Trend (7d)
        </h3>
      </div>
      <div className="flex-1 px-2 pt-3 pb-1">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formatted} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--bg-elevated)' }} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
            <Bar dataKey="HIGH" stackId="a" fill="var(--sev-high)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="MEDIUM" stackId="a" fill="var(--sev-med)" />
            <Bar dataKey="LOW" stackId="a" fill="var(--sev-low)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
