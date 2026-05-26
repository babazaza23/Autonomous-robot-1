import { CheckCircle2, XCircle } from 'lucide-react';

interface ConnectionBadgeProps {
  label: string;
  connected: boolean;
}

export default function ConnectionBadge({ label, connected }: ConnectionBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
      connected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
    }`}>
      {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}: {connected ? 'Trực tuyến' : 'Ngoại tuyến'}
    </span>
  );
}
