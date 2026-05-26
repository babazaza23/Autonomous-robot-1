import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, description, icon, action, children, className = '' }: SectionCardProps) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || description || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950">
                {icon}
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
