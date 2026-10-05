import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base">
      {/* Ambient glow — purely decorative, behind all content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 80% 0%, rgba(163, 113, 247, 0.13) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 35% at 5% 100%, rgba(163, 113, 247, 0.07) 0%, transparent 70%)',
          ].join(', '),
          zIndex: 0,
        }}
      />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative z-[1]">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8 bg-base">
          <Outlet />
        </main>
      </div>
      <OnboardingWizard />
    </div>
  );
}
