import { Activity, Cpu, Gauge, Radio, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import type { RobotHardwareTelemetry, RobotTelemetryState } from '../types/robot';

interface SensorPageProps {
  robotTelemetry: RobotTelemetryState;
  selectedRobotId: string;
}

interface DiagnosticSample {
  t: number;
  ultrasonic: number | null;
  distance: number | null;
  yaw: number | null;
}

export default function SensorPage({ robotTelemetry, selectedRobotId }: SensorPageProps) {
  const telemetry = robotTelemetry.latestTelemetry;
  const [samples, setSamples] = useState<DiagnosticSample[]>([]);

  useEffect(() => {
    if (!telemetry?.timestamp) return;
    const timer = window.setTimeout(() => {
      setSamples(prev => [
        ...prev,
        {
          t: new Date(telemetry.timestamp).getTime(),
          ultrasonic: telemetry.obstacle.ultrasonicDistance,
          distance: telemetry.encoder.distanceTravelledCm,
          yaw: telemetry.mpu.yawDeg,
        },
      ].slice(-40));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    telemetry?.encoder.distanceTravelledCm,
    telemetry?.mpu.yawDeg,
    telemetry?.obstacle.ultrasonicDistance,
    telemetry?.timestamp,
  ]);

  if (!telemetry) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cảm biến" description="Chưa có telemetry. Khi ESP32-S3 gửi heartbeat, trang này sẽ hiển thị dữ liệu cảm biến thật hoặc simulator nếu bật chế độ demo." />
        <SectionCard title="Chờ dữ liệu" description={`Robot ${selectedRobotId} đang chờ telemetry.`}>
          <p className="text-sm text-[#64748B]">Không hiển thị dòng motor hoặc pin phần trăm khi phần cứng chưa đo được.</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cảm biến"
        description="Chỉ hiển thị dữ liệu robot thật có thể gửi: line sensor, siêu âm, camera, UART, L298N, servo command, encoder, MPU và odometry."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="IR_LEFT" value={telemetry.line.irLeft} icon={Activity} tone="slate" sub="Cảm biến dò line" />
        <MetricCard label="IR_CENTER" value={telemetry.line.irCenter} icon={Activity} tone="green" sub={translateStatus(telemetry.line.lineStatus)} />
        <MetricCard label="IR_RIGHT" value={telemetry.line.irRight} icon={Activity} tone="slate" sub="Cảm biến dò line" />
        <MetricCard
          label="Ultrasonic"
          value={telemetry.obstacle.ultrasonicDistance == null ? 'Chưa có' : `${telemetry.obstacle.ultrasonicDistance.toFixed(0)}cm`}
          icon={Gauge}
          tone={distanceTone(telemetry.obstacle.ultrasonicDistance)}
          sub={translateStatus(telemetry.obstacle.status)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <TelemetryChart title="Khoảng cách siêu âm" data={samples} dataKey="ultrasonic" color="#06B6D4" unit="cm" />
        <TelemetryChart title="Quãng đường encoder" data={samples} dataKey="distance" color="#2563EB" unit="cm" />
        <TelemetryChart title="Góc yaw / hướng" data={samples} dataKey="yaw" color="#F59E0B" unit="độ" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Kết nối và cảm biến" description="Trạng thái kết nối và cảm biến phù hợp phần cứng hiện tại.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Health label="ESP32-S3" value={telemetry.connection.esp32 ? 'Trực tuyến' : 'Mất kết nối'} ok={telemetry.connection.esp32} icon={Cpu} />
            <Health label="UNO R3" value={nullableBool(telemetry.connection.uno)} ok={telemetry.connection.uno !== false} icon={Cpu} />
            <Health label="UART" value={nullableBool(telemetry.connection.uart)} ok={telemetry.connection.uart !== false} icon={Radio} />
            <Health label="WiFi/Máy chủ" value={`${telemetry.connection.wifi ? 'WiFi OK' : 'WiFi mất kết nối'} / ${telemetry.connection.server ? 'Server OK' : 'Server mất kết nối'}`} ok={telemetry.connection.wifi && telemetry.connection.server} icon={Wifi} />
            <Health label="Camera" value={telemetry.camera.connected ? translateStatus(telemetry.camera.mode) : 'Mất kết nối'} ok={telemetry.camera.connected !== false} icon={Activity} />
            <Health label="L298N" value={translateStatus(telemetry.motion.l298n)} ok={telemetry.motion.l298n === 'OK'} icon={Activity} />
          </div>
        </SectionCard>

        <SectionCard title="Encoder và MPU Odometry" description="Vị trí ước lượng từ encoder + MPU, không phải định vị tuyệt đối nếu chưa có AprilTag/UWB/marker reset.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Mini label="Xung trái" value={formatNumber(telemetry.encoder.leftTicks, 0)} />
            <Mini label="Xung phải" value={formatNumber(telemetry.encoder.rightTicks, 0)} />
            <Mini label="Quãng đường trái" value={`${formatNumber(telemetry.encoder.leftDistanceCm)} cm`} />
            <Mini label="Quãng đường phải" value={`${formatNumber(telemetry.encoder.rightDistanceCm)} cm`} />
            <Mini label="Ước lượng vận tốc thẳng" value={`${formatNumber(telemetry.encoder.linearVelocityCms)} cm/s`} />
            <Mini label="Góc yaw MPU" value={`${formatNumber(telemetry.mpu.yawDeg)} deg`} />
            <Mini label="GyroZ MPU" value={`${formatNumber(telemetry.mpu.gyroZ)} deg/s`} />
            <Mini label="Trạng thái odometry" value={telemetry.localization.driftWarning ? 'Có cảnh báo trôi' : translateStatus(telemetry.localization.confidence)} />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Góc lệnh servo" description="MG90S không có feedback vị trí thật, các giá trị này là góc lệnh điều khiển.">
          <div className="space-y-4">
            {(['base', 'shoulder', 'elbow', 'gripper'] as const).map(servo => (
              <ServoBar key={servo} label={servoLabel(servo)} value={telemetry.arm[servo]} max={servo === 'gripper' ? 90 : 180} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Lệnh motor/PWM" description="Không hiển thị dòng motor vì robot chưa có cảm biến dòng/mạch đo motor.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Mini label="Lệnh/PWM motor trái" value={formatNumber(telemetry.motion.leftMotorCommand, 0)} />
            <Mini label="Lệnh/PWM motor phải" value={formatNumber(telemetry.motion.rightMotorCommand, 0)} />
            <Mini label="Node hiện tại" value={telemetry.motion.currentNode ?? 'Chưa có'} />
            <Mini label="Cạnh hiện tại" value={telemetry.motion.currentEdge ?? 'Chưa có'} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function TelemetryChart({ title, data, dataKey, color, unit }: { title: string; data: DiagnosticSample[]; dataKey: keyof DiagnosticSample; color: string; unit: string }) {
  const rows = data.map((item, index) => ({ ...item, index, [dataKey]: item[dataKey] ?? 0 }));
  return (
    <SectionCard title={title} description={`Lịch sử thời gian thực (${unit}).`}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
          <XAxis dataKey="index" stroke="#64748B" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12 }} />
          <Line type="monotone" dataKey={dataKey as string} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

function Health({ label, value, ok, icon: Icon }: { label: string; value: string; ok: boolean; icon: ElementType }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-[#0F172A]"><Icon className="h-4 w-4 text-[#2563EB]" /> {label}</p>
        <StatusBadge tone={ok ? 'green' : 'red'}>{ok ? 'OK' : 'Lỗi'}</StatusBadge>
      </div>
      <p className="mt-2 text-xs text-[#64748B]">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
      <p className="text-xs font-bold uppercase text-[#64748B]">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function ServoBar({ label, value, max }: { label: string; value: number | null; max: number }) {
  const normalized = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-[#64748B]">
        <span>{label.toUpperCase()}</span>
        <span>{value == null ? 'Chưa có' : `${value.toFixed(0)}deg`}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-200">
        <div className="h-3 rounded-full bg-[#2563EB]" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

function distanceTone(value: RobotHardwareTelemetry['obstacle']['ultrasonicDistance']): 'slate' | 'red' | 'amber' | 'green' {
  if (value == null) return 'slate';
  if (value < 30) return 'red';
  if (value < 50) return 'amber';
  return 'green';
}

function nullableBool(value: boolean | null) {
  if (value == null) return 'Chưa rõ';
  return value ? 'Đã kết nối' : 'Mất kết nối';
}

function formatNumber(value: number | null | undefined, fractionDigits = 1) {
  return value == null ? 'Chưa có' : value.toFixed(fractionDigits);
}

function translateStatus(status: string) {
  const labels: Record<string, string> = {
    OK: 'Bình thường',
    UNKNOWN: 'Chưa rõ',
    NORMAL_LINE: 'Line bình thường',
    LOST_LINE: 'Mất line',
    CLEAR: 'Không có vật cản',
    OBSTACLE: 'Có vật cản',
    EVENT_SNAPSHOT: 'Chụp theo sự kiện',
    LOW_FPS_MONITORING: 'Giám sát FPS thấp',
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
  };
  return labels[status] ?? status;
}

function servoLabel(servo: string) {
  const labels: Record<string, string> = { base: 'Đế', shoulder: 'Vai', elbow: 'Khuỷu', gripper: 'Kẹp' };
  return labels[servo] ?? servo;
}
