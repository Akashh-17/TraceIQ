import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen rules-band bg-base flex items-center justify-center p-6">
      <div className="text-center max-w-[480px] animate-blur-fade-in">
        <p className="kicker mb-8">Error / Not Found</p>
        <h1 className="font-heading text-[clamp(80px,15vw,140px)] leading-none text-primary/10 select-none pointer-events-none">
          404
        </h1>
        <div className="rule my-8" />
        <h2 className="font-heading text-3xl font-medium text-primary mb-3">
          Page not found
        </h2>
        <p className="text-secondary text-[14px] font-sans leading-relaxed mb-10">
          The page you're looking for doesn't exist or was moved.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 border border-border font-mono text-[10px] uppercase tracking-[0.2em] text-secondary hover:text-primary hover:border-primary/30 transition-colors rounded-[4px]"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
