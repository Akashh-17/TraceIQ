import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={cn(
        'flex items-center justify-center w-6 h-6 rounded transition-colors',
        'text-secondary hover:text-primary hover:bg-border-muted'
      )}
    >
      {copied
        ? <Check size={13} className="text-status-resolved" />
        : <Copy size={13} />
      }
    </button>
  );
}
