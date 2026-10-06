import { Link } from 'react-router-dom';

// Mark: a trace line with one spike — an event that stands out from normal activity.
export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 hover:no-underline" aria-label="TraceIQ home">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[linear-gradient(135deg,#7c4dff,#4f7cff)] shadow-[0_0_20px_rgba(124,77,255,0.35)]">
        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" aria-hidden="true">
          <path d="M2 11h4l2-6 3 10 2-4h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-sans text-[17px] font-semibold tracking-tight text-white">TraceIQ</span>
    </Link>
  );
}
