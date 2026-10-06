import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// Catches render errors inside one page, so a bug there shows a message
// instead of blanking the whole app (sidebar and navigation keep working).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Page crashed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="kicker">Something went wrong on this page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-secondary hover:text-primary transition-colors rounded-[4px]"
        >
          Reload
        </button>
      </div>
    );
  }
}
