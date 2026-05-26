import { OctagonAlert } from 'lucide-react';

interface EmergencyStopButtonProps {
  onClick?: () => void;
  compact?: boolean;
}

export default function EmergencyStopButton({ onClick, compact }: EmergencyStopButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] font-semibold text-white shadow-sm transition-colors hover:bg-red-700 ${
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
      }`}
    >
      <OctagonAlert className="h-4 w-4" />
      Dừng khẩn cấp
    </button>
  );
}
