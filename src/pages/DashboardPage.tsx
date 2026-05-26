import { AlertTriangle, Battery, Bot, Cpu, MapPin, Plus, Radar, Route, Shield, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import type { ElementType } from 'react';
import AlertBadge from '../components/common/AlertBadge';
import EmergencyStopButton from '../components/common/EmergencyStopButton';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import type { Alert } from '../types/alert';
import { DEFAULT_ROBOT_ID, getBatteryDisplay, RobotTaskSnapshot, RobotTelemetryState } from '../types/robot';

interface DashboardPageProps {
  robotTelemetry: RobotTelemetryState;
  selectedRobotId: string;
  onSelectRobot: (robotId: string) => void;
  currentTask: RobotTaskSnapshot | null;
  alerts: Alert[];
}

const taskSteps = [
  'WAITING_TASK',
  'MOVE_TO_PICKUP',
  'ARRIVED_PICKUP',
  'IDENTIFY_ITEM',
  'GRIP_ITEM',
  'ITEM_GRIPPED',
  'MOVE_TO_DROP',
  'ARRIVED_DROP',
  'RELEASE_ITEM',
  'ITEM_RELEASED',
  'TASK_COMPLETED',
];

export default function DashboardPage({ robotTelemetry, selectedRobotId, onSelectRobot, currentTask, alerts }: DashboardPageProps) {
  const [showAddRobot, setShowAddRobot] = useState(false);
  const telemetry = robotTelemetry.latestTelemetry;
  const battery = getBatteryDisplay(telemetry?.power ?? { source: '3S_18650_BATTERY_HOLDER', packVoltage: null, batteryPercent: null });
  const selectedRobot = robotTelemetry.registeredRobots.find(robot => robot.robotId === selectedRobotId) ?? robotTelemetry.registeredRobots[0];
  const robotOnline = robotTelemetry.robotOnline;
  const robotList = robotTelemetry.registeredRobots;
  const now = robotTelemetry.now;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan WMS Robot"
        description="Tổng quan realtime cho robot thật: kết nối, nhiệm vụ, node/edge, cảm biến, encoder, MPU và cảnh báo."
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAddRobot(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> + Thêm robot
            </button>
            <EmergencyStopButton compact />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Robot" value={selectedRobot?.robotId ?? DEFAULT_ROBOT_ID} sub={robotOnline ? 'Robot đang trực tuyến' : robotTelemetry.connected ? 'Đang chờ dữ liệu từ ESP32-S3' : 'Máy chủ chưa kết nối'} icon={robotOnline ? Wifi : WifiOff} tone={robotOnline ? 'green' : 'red'} />
        <MetricCard label="Trạng thái" value={translateRobotState(telemetry?.state ?? 'NO_TELEMETRY')} sub={robotTelemetry.source === 'simulator' ? 'Đang dùng dữ liệu mô phỏng' : robotTelemetry.source === 'server' ? 'Telemetry thật' : 'Chờ heartbeat'} icon={Bot} tone={telemetry?.state === 'EMERGENCY_STOP' ? 'red' : 'blue'} />
        <MetricCard label="Nhiệm vụ hiện tại" value={currentTask?.taskId ?? telemetry?.currentTask?.taskId ?? 'Không có'} sub={translateRobotState(currentTask?.currentStep ?? telemetry?.currentTask?.currentStep ?? 'WAITING_TASK')} icon={Route} tone={currentTask ? 'blue' : 'slate'} />
        <MetricCard label="Pin" value={battery.percentLabel} sub={`${battery.label} - ${battery.voltageLabel}`} icon={Battery} tone={battery.tone} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard title="Node hiện tại" value={telemetry?.motion.currentNode ?? 'Chưa có'} icon={MapPin} />
        <InfoCard title="Cạnh hiện tại" value={telemetry?.motion.currentEdge ?? 'Chưa có'} icon={Route} />
        <InfoCard title="Đang giữ hàng" value={telemetry?.arm.holdingItem ? 'Có' : 'Không'} icon={Shield} tone={telemetry?.arm.holdingItem ? 'green' : 'slate'} />
        <InfoCard title="Trạng thái line" value={translateRobotState(telemetry?.line.lineStatus ?? 'NO_TELEMETRY')} icon={Radar} tone={telemetry?.line.lineStatus === 'LOST_LINE' ? 'red' : 'green'} />
        <InfoCard title="Khoảng cách vật cản" value={telemetry?.obstacle.ultrasonicDistance == null ? 'Chưa có' : `${telemetry.obstacle.ultrasonicDistance.toFixed(0)}cm`} icon={AlertTriangle} tone={(telemetry?.obstacle.ultrasonicDistance ?? 99) < 30 ? 'red' : (telemetry?.obstacle.ultrasonicDistance ?? 99) < 50 ? 'amber' : 'green'} />
        <InfoCard title="Encoder" value={translateRobotState(telemetry?.encoder.status ?? 'UNKNOWN')} icon={Cpu} tone={telemetry?.encoder.status === 'OK' ? 'green' : 'amber'} />
        <InfoCard title="MPU" value={telemetry?.mpu.connected ? telemetry.mpu.headingStatus : 'Mất kết nối'} icon={Cpu} tone={telemetry?.mpu.connected ? 'green' : 'red'} />
        <InfoCard title="Camera" value={telemetry?.camera.connected ? telemetry.camera.mode : 'Mất kết nối'} icon={Radar} tone={telemetry?.camera.connected ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Timeline nhiệm vụ" description="Luồng gắp item, giữ item, di chuyển đến khu vực màu tương ứng và thả item.">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {taskSteps.map(step => {
              const activeStep = currentTask?.currentStep ?? telemetry?.currentTask?.currentStep ?? telemetry?.state ?? 'WAITING_TASK';
              const activeIndex = taskSteps.indexOf(activeStep);
              const index = taskSteps.indexOf(step);
              const done = activeIndex >= index && activeIndex >= 0;
              return (
                <div key={step} className={`rounded-xl border p-3 ${done ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  <p className="text-xs font-semibold">{translateRobotState(step)}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Định vị tương đối" description="Odometry ước lượng từ encoder + MPU; có thể trôi nếu chưa có mốc reset tuyệt đối.">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Tọa độ X ước lượng" value={formatNumber(telemetry?.localization.estimatedX)} />
            <Mini label="Tọa độ Y ước lượng" value={formatNumber(telemetry?.localization.estimatedY)} />
            <Mini label="Góc quay ước lượng" value={formatNumber(telemetry?.localization.estimatedTheta)} />
            <Mini label="Độ tin cậy" value={translateRobotState(telemetry?.localization.confidence ?? 'UNKNOWN')} />
            <Mini label="Cảnh báo trôi" value={telemetry?.localization.driftWarning ? 'Có' : 'Không'} />
            <Mini label="Phương pháp" value={translateRobotState(telemetry?.localization.method ?? 'UNKNOWN')} />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Danh sách robot" description="Robot thêm từ UI chỉ ở trạng thái chờ cho đến khi ESP32-S3 gửi heartbeat thật.">
          <div className="space-y-2">
            {robotList.map(robot => {
              const itemTelemetry = robotTelemetry.telemetryByRobotId[robot.robotId];
              const online = robot.robotId === selectedRobotId ? robotOnline : Boolean(itemTelemetry && now - (itemTelemetry.receivedAt ?? itemTelemetry.timestamp) <= 5000);
              return (
                <button key={robot.robotId} onClick={() => onSelectRobot(robot.robotId)}
                  className={`w-full rounded-xl border p-3 text-left ${selectedRobotId === robot.robotId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-950">{robot.name}</p>
                      <p className="text-xs text-slate-500">{robot.robotId} - {itemTelemetry?.motion.currentNode ?? 'Chưa có telemetry'}</p>
                    </div>
                    <StatusBadge tone={online ? 'green' : 'red'}>{online ? 'Trực tuyến' : 'Đang chờ telemetry'}</StatusBadge>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Cảnh báo realtime" description="Chỉ báo những lỗi phù hợp với phần cứng thật, không báo pin yếu nếu chưa đo pin.">
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-950">{alert.message}</p>
                  <AlertBadge level={alert.severity} />
                </div>
                {alert.details && <p className="mt-1 text-xs text-slate-500">{alert.details}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {showAddRobot && (
        <AddRobotModal onClose={() => setShowAddRobot(false)} onAdd={async robot => {
          await robotTelemetry.addRobot(robot);
          setShowAddRobot(false);
        }} />
      )}
    </div>
  );
}

function InfoCard({ title, value, icon: Icon, tone = 'slate' }: { title: string; value: string; icon: ElementType; tone?: 'green' | 'amber' | 'red' | 'slate' }) {
  const toneClass = tone === 'green' ? 'text-emerald-700 bg-emerald-50' : tone === 'amber' ? 'text-amber-700 bg-amber-50' : tone === 'red' ? 'text-red-700 bg-red-50' : 'text-slate-700 bg-slate-50';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-600">{title}</p>
          <p className="mt-2 break-words text-lg font-bold text-slate-950">{value}</p>
        </div>
        <span className={`rounded-xl p-2 ${toneClass}`}><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AddRobotModal({ onClose, onAdd }: { onClose: () => void; onAdd: (robot: { robotId: string; name: string; type: string; hardwareNote?: string }) => Promise<void> }) {
  const [robotId, setRobotId] = useState('robot-02');
  const [name, setName] = useState('robot-02');
  const [type, setType] = useState('Line-following AGV');
  const [hardwareNote, setHardwareNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">+ Thêm robot</h2>
        <p className="mt-1 text-sm text-slate-500">Robot mới chỉ ở trạng thái chờ cho đến khi ESP32-S3 gửi heartbeat thật.</p>
        <div className="mt-4 space-y-3">
          <Input label="Robot ID" value={robotId} onChange={setRobotId} />
          <Input label="Tên robot" value={name} onChange={setName} />
          <Input label="Loại robot" value={type} onChange={setType} />
          <Input label="Ghi chú phần cứng" value={hardwareNote} onChange={setHardwareNote} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Hủy</button>
          <button onClick={() => onAdd({ robotId, name, type, hardwareNote })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thêm robot</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-600">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600" />
    </label>
  );
}

function formatNumber(value: number | null | undefined) {
  return value == null ? 'Chưa có' : value.toFixed(1);
}

function translateRobotState(state: string) {
  const labels: Record<string, string> = {
    NO_TELEMETRY: 'Chưa có telemetry',
    FOLLOW_LINE: 'Dò line',
    RESUME_LINE: 'Tiếp tục dò line',
    WAITING_TASK: 'Đang chờ nhiệm vụ',
    ARRIVED_PICKUP: 'Đã đến điểm gắp',
    IDENTIFY_ITEM: 'Nhận diện vật phẩm',
    GRIP_ITEM: 'Gắp vật phẩm',
    ITEM_GRIPPED: 'Đã gắp vật phẩm',
    ARRIVED_DROP: 'Đã đến điểm thả',
    RELEASE_ITEM: 'Thả vật phẩm',
    ITEM_RELEASED: 'Đã thả vật phẩm',
    TASK_COMPLETED: 'Hoàn tất nhiệm vụ',
    MOVE_TO_PICKUP: 'Đến điểm gắp',
    MOVE_TO_DROP: 'Đến điểm thả',
    MOVING_ON_EDGE: 'Đang di chuyển',
    EMERGENCY_STOP: 'Dừng khẩn cấp',
    EMERGENCY_STOP_PERSON: 'Dừng khẩn cấp do người',
    STOP_AND_RECHECK: 'Dừng và kiểm tra lại',
    STOP_AND_SCAN: 'Dừng và quét vật cản',
    SLOW_DOWN_AND_MONITOR: 'Giảm tốc và theo dõi',
    BLOCKED_PATH: 'Đường bị chặn',
    WAIT: 'Chờ',
    YIELD_OR_WAIT: 'Nhường đường hoặc chờ',
    NORMAL_LINE: 'Dò line ổn định',
    WEAK_LINE: 'Line yếu',
    LOST_LINE: 'Mất line',
    OK: 'Tốt',
    UNKNOWN: 'Chưa rõ',
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    ENCODER_MPU_ODOMETRY: 'Encoder + MPU',
  };
  return labels[state] ?? state;
}
