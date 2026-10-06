import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';

const PAGE_LABELS: { prefix: string; label: string }[] = [
  { prefix: '/dashboard',      label: '01 / Dashboard'      },
  { prefix: '/events',         label: '02 / Audit Log'       },
  { prefix: '/detections',     label: '03 / Detections'      },
  { prefix: '/investigations', label: '04 / Investigations'  },
  { prefix: '/actors',         label: 'Actor Profile'        },
  { prefix: '/integration',    label: '05 / Integration'     },
  { prefix: '/users',          label: '06 / Users & Access'  },
  { prefix: '/settings',       label: '07 / Settings'        },
];

function getPageLabel(pathname: string): string {
  const match = PAGE_LABELS.find(({ prefix }) => pathname.startsWith(prefix));
  return match?.label ?? 'TraceIQ';
}

export function Topbar() {
  const logout   = useAuthStore(state => state.logout);
  const user     = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // ignore
    }
    logout();
    // Drop cached tenant data so the next person to log in never sees it.
    qc.clear();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between h-16 px-8 border-b border-border bg-surface shrink-0">

      {/* Current page breadcrumb */}
      <p className="kicker">{getPageLabel(pathname)}</p>

      {/* Right side: user initial + logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 border border-border bg-elevated font-mono text-[12px] uppercase text-primary">
          {user?.email?.[0]?.toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors"
        >
          Logout ↗
        </button>
      </div>

    </header>
  );
}
