import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import AlertBadge from '../components/common/AlertBadge';
import DataTable, { DataTableColumn } from '../components/common/DataTable';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import { Alert } from '../types/alert';

interface AlertPageProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onAcknowledgeAll: () => void;
  onClearResolved: () => void;
}

const typeLabels: Record<string, string> = {
  ROBOT_OFFLINE: 'Robot mất kết nối',
  ESP32_DISCONNECTED: 'ESP32-S3 mất kết nối',
  UNO_DISCONNECTED: 'UNO R3 mất kết nối',
  UART_TIMEOUT: 'UART quá thời gian phản hồi',
  CAMERA_DISCONNECTED: 'Camera mất kết nối',
  OBSTACLE_NEAR: 'Vật cản gần',
  OBSTACLE_DANGER: 'Vật cản nguy hiểm',
  LOST_LINE: 'Mất line',
  MPU_DISCONNECTED: 'MPU mất kết nối',
  ENCODER_ERROR: 'Lỗi encoder',
  ODOMETRY_DRIFT: 'Sai số odometry',
  BATTERY_UNKNOWN: 'Pin chưa đo được',
  LOW_BATTERY: 'Pin yếu',
  UNKNOWN_COLOR: 'Màu không xác định',
  EMERGENCY_STOP: 'Dừng khẩn cấp',
  TRAFFIC_CONFLICT: 'Xung đột traffic',
  EDGE_RESERVED_CONFLICT: 'Xung đột edge reserved',
  ROBOT_WAITING_TRAFFIC: 'Robot chờ traffic',
  obstacle_detected: 'Cảnh báo vật cản',
  person_detected: 'Người chặn đường',
  line_lost: 'Mất vạch',
  line_faded: 'Vạch mờ',
  low_battery: 'Pin dưới 20%',
  critical_battery: 'Pin hết',
  uart_disconnected: 'Mất kết nối UART',
  mqtt_disconnected: 'Mất kết nối MQTT',
  motor_stall: 'Lỗi động cơ',
  temperature_high: 'Nhiệt độ cao',
  task_failed: 'Nhiệm vụ thất bại',
  path_blocked: 'Đường bị chặn',
};

export default function AlertPage({ alerts, onAcknowledge, onAcknowledgeAll, onClearResolved }: AlertPageProps) {
  const [filter, setFilter] = useState('all');
  const filtered = alerts.filter(alert => filter === 'all' || normalizeLevel(alert.severity) === filter);
  const critical = alerts.filter(alert => normalizeLevel(alert.severity) === 'critical' && !alert.acknowledged).length;
  const high = alerts.filter(alert => normalizeLevel(alert.severity) === 'high' && !alert.acknowledged).length;
  const medium = alerts.filter(alert => normalizeLevel(alert.severity) === 'medium' && !alert.acknowledged).length;
  const low = alerts.filter(alert => normalizeLevel(alert.severity) === 'low' && !alert.acknowledged).length;
  const columns = useMemo<DataTableColumn<Alert>[]>(() => [
    {
      key: 'time',
      header: 'Thời gian',
      className: 'mono text-xs text-[#64748B]',
      render: alert => new Date(alert.timestamp).toLocaleString('vi-VN'),
    },
    {
      key: 'level',
      header: 'Mức độ',
      render: alert => <AlertBadge level={normalizeLevel(alert.severity)} />,
    },
    {
      key: 'type',
      header: 'Loại',
      className: 'text-[#0F172A]',
      render: alert => typeLabels[alert.type] ?? alert.type,
    },
    {
      key: 'robot',
      header: 'Robot',
      className: 'mono text-xs text-[#64748B]',
      render: alert => alert.robotId,
    },
    {
      key: 'message',
      header: 'Tin nhắn',
      className: 'text-[#0F172A]',
      render: alert => alert.message,
    },
    {
      key: 'state',
      header: 'Trạng thái',
      render: alert => alert.acknowledged ? <StatusBadge tone="green">Đã xử lý</StatusBadge> : <StatusBadge tone="red">Đang mở</StatusBadge>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cảnh Báo"
        description="Trung tâm cảnh báo cho người vận hành về an toàn robot, AI Vision, đo lường từ xa và giao tiếp."
        action={
          <div className="flex gap-2">
            <button onClick={onAcknowledgeAll} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" /> Đánh dấu đã xử lý tất cả
            </button>
            <button onClick={onClearResolved} className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#0F172A] hover:bg-slate-50">
              <Trash2 className="h-3.5 w-3.5" /> Xóa cảnh báo đã xử lý
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Summary label="Nghiêm trọng" value={critical} tone="critical" />
        <Summary label="Cao" value={high} tone="high" />
        <Summary label="Trung bình" value={medium} tone="medium" />
        <Summary label="Thấp" value={low} tone="low" />
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'critical', 'high', 'medium', 'low'].map(level => (
          <button key={level} onClick={() => setFilter(level)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filter === level ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A]'}`}>
            {level === 'all' ? 'Tất cả' : levelLabel(level)}
          </button>
        ))}
      </div>

      <SectionCard title="Thẻ Cảnh Báo" description="Các cảnh báo an toàn mới nhất hiển thị đầu tiên.">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.slice(0, 8).map(alert => {
            const level = normalizeLevel(alert.severity);
            return (
              <div key={alert.id} className={`rounded-xl border-l-8 border p-4 ${levelClass(level)} ${alert.acknowledged ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertBadge level={level} />
                      <span className="text-xs font-bold text-[#64748B]">{typeLabels[alert.type] ?? alert.type}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#0F172A]">{alert.message}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{alert.details}</p>
                    <p className="mt-2 text-xs text-[#64748B]">Robot {alert.robotId} · {new Date(alert.timestamp).toLocaleString('vi-VN')}</p>
                  </div>
                  {!alert.acknowledged && (
                    <button onClick={() => onAcknowledge(alert.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0F172A] ring-1 ring-[#E2E8F0] hover:bg-slate-50">
                      Đã xử lý
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <EmptyState title="Không có cảnh báo" description="Không có cảnh báo nào khớp với bộ lọc." icon={AlertTriangle} />}
        </div>
      </SectionCard>

      <SectionCard title="Bảng Cảnh Báo" description="Chế độ xem gọn gàng để đánh giá và báo cáo.">
        <DataTable rows={filtered} columns={columns} getRowKey={alert => alert.id} />
      </SectionCard>
    </div>
  );
}

function normalizeLevel(severity: string) {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'medium';
  if (severity === 'info') return 'low';
  return severity;
}

function levelClass(level: string) {
  if (level === 'critical') return 'border-red-600 bg-red-50';
  if (level === 'high') return 'border-orange-500 bg-orange-50';
  if (level === 'medium') return 'border-amber-500 bg-amber-50';
  return 'border-slate-400 bg-slate-50';
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${levelClass(tone)}`}>
      <p className="text-3xl font-bold text-[#0F172A]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase text-[#64748B]">{label}</p>
    </div>
  );
}

function levelLabel(level: string) {
  if (level === 'critical') return 'Nghiêm trọng';
  if (level === 'high') return 'Cao';
  if (level === 'medium') return 'Trung bình';
  if (level === 'low') return 'Thấp';
  return level;
}
