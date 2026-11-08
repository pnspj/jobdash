import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Page heading (h1) with its icon. */
export default function PageTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h1 className="flex items-center gap-2 text-2xl font-bold">
      <Icon className="h-6 w-6 shrink-0 text-slate-500" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </h1>
  );
}
