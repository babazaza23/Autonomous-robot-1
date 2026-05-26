import type { ElementType, ReactNode } from 'react';

interface IconTileProps {
  icon: ElementType;
  title: string;
  description?: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  children?: ReactNode;
}

const tones = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

export default function IconTile({ icon: Icon, title, description, tone = 'blue', children }: IconTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-xl p-2.5 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
      {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      {children}
    </div>
  );
}
