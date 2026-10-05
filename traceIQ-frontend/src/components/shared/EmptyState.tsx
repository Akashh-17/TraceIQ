interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function EmptyState({ title, description, icon, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-6 text-center border border-dashed border-border max-w-2xl mx-auto">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="kicker">{title}</p>
      <div className="rule w-16" />
      <p className="text-[13px] text-secondary leading-relaxed max-w-sm font-sans">{description}</p>
      {children && <div className="w-full mt-2">{children}</div>}
    </div>
  );
}
