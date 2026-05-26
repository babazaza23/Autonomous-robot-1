import type { ElementType } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ElementType;
}

export default function EmptyState({ title, description, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon className="mx-auto h-8 w-8 text-slate-500" />
      <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
  );
}
