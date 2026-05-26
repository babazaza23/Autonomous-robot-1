import type { ReactNode } from 'react';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'purple';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
};

const dotTones: Record<Tone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-500',
  purple: 'bg-violet-500',
};

export default function StatusBadge({ children, tone = 'slate', dot, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />}
      {children}
    </span>
  );
}
