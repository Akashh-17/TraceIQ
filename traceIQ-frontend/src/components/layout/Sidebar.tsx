import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard',      num: '01', label: 'Dashboard'      },
  { to: '/events',         num: '02', label: 'Audit Log'       },
  { to: '/detections',     num: '03', label: 'Detections'      },
  { to: '/investigations', num: '04', label: 'Investigations'  },
  { to: '/integration',   num: '05', label: 'Integration'      },
];

const ADMIN_ITEMS = [
  { to: '/users', num: '06', label: 'Users & Access' },
];

function NavItem({ to, num, label }: { to: string; num: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 transition-all duration-150',
          isActive
            ? 'text-primary bg-elevated/60 shadow-[inset_2px_0_0_var(--color-accent-ai)]'
            : 'text-secondary hover:text-primary hover:bg-elevated/30'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'w-1.5 h-1.5 shrink-0',
              isActive ? 'bg-accent-ai' : 'bg-transparent'
            )}
          />
          <span className="font-mono text-[11px] text-muted shrink-0 tracking-widest">
            {num}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.15em]">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const user    = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <aside className="flex flex-col w-[280px] shrink-0 bg-surface border-r border-accent-ai/20">

      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-border">
        <span className="font-heading text-2xl font-medium tracking-tight text-primary">
          Trace<span className="text-accent-ai">IQ</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-4 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        {isAdmin && (
          <>
            <div className="my-3 mx-3 rule" />
            {ADMIN_ITEMS.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}

        {/* Settings pinned to bottom */}
        <div className="mt-auto pt-3">
          <div className="mx-3 rule mb-3" />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 transition-all duration-150',
                isActive
                  ? 'text-primary bg-elevated/60 shadow-[inset_2px_0_0_var(--color-accent-ai)]'
                  : 'text-secondary hover:text-primary hover:bg-elevated/30'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('w-1.5 h-1.5 shrink-0', isActive ? 'bg-accent-ai' : 'bg-transparent')} />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em]">Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 border border-border bg-elevated font-mono text-[12px] uppercase text-primary shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="font-mono text-[11px] text-primary truncate">
              {user?.email}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
}
