import { Sparkles } from 'lucide-react';

export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2">
      <Sparkles className="h-6 w-6 text-primary" />
      <span className="text-lg font-semibold tracking-tight">PromptForge</span>
    </a>
  );
}
