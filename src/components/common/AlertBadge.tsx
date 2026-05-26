import StatusBadge from './StatusBadge';

interface AlertBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'info' | 'warning' | 'critical' | string;
}

export default function AlertBadge({ level }: AlertBadgeProps) {
  const normalized = level.toLowerCase();
  const tone = normalized === 'critical' || normalized === 'high'
    ? 'red'
    : normalized === 'medium' || normalized === 'warning'
      ? 'amber'
      : normalized === 'low' || normalized === 'info'
        ? 'blue'
        : 'slate';

  const labelMap: Record<string, string> = {
    critical: 'Nghiêm trọng',
    high: 'Cao',
    medium: 'Trung bình',
    warning: 'Cảnh báo',
    low: 'Thấp',
    info: 'Thông tin',
  };

  return <StatusBadge tone={tone}>{labelMap[normalized] ?? level.toString()}</StatusBadge>;
}
