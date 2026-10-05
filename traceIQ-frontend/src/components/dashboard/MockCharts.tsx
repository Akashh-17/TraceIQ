import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{payload[0].value}</p>
    </div>
  );
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-[280px]">
      <div className="px-4 py-3 border-b border-border-muted">
        <h3 className="text-[12px] font-semibold text-secondary uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex-1 px-2 pt-3 pb-1">
        {children}
      </div>
    </div>
  );
}

export function ActionDistributionChart({ data }: { data: { action: string; count: number }[] }) {
  return (
    <ChartCard title="Top Actions">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="action"
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={130}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
          />
          <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--bg-elevated)' }} />
          <Bar dataKey="count" fill="var(--accent)" radius={[0, 3, 3, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopActorsChart({ data }: { data: { actor: string; count: number }[] }) {
  return (
    <ChartCard title="Top Actors">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="actor"
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={130}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
          />
          <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--bg-elevated)' }} />
          <Bar dataKey="count" fill="var(--sev-low)" radius={[0, 3, 3, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
