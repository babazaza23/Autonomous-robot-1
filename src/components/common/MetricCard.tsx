import type { ElementType, ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ElementType;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  footer?: ReactNode;
}

const tones = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

export default function MetricCard({ label, value, sub, icon: Icon, tone = 'slate', footer }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
