import { Activity, Battery, Bot, Camera, Cpu, Gauge, Radio, Radar, Route, Wifi, WifiOff } from 'lucide-react';
import type { ElementType } from 'react';
import EmergencyStopButton from '../components/common/EmergencyStopButton';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import { DEFAULT_ROBOT_ID, getBatteryDisplay, RobotHardwareTelemetry, RobotTelemetryState } from '../types/robot';

interface RobotPageProps {
  robotTelemetry: RobotTelemetryState;
  selectedRobotId: string;
  onSelectRobot: (robotId: string) => void;
}

type Tone = 'green' | 'amber' | 'red' | 'slate' | 'blue';

export default function RobotPage({ robotTelemetry, selectedRobotId, onSelectRobot }: RobotPageProps) {
  const telemetry = robotTelemetry.latestTelemetry;
  const selectedRobot = robotTelemetry.registeredRobots.find(robot => robot.robotId === selectedRobotId);
  const online = robotTelemetry.robotOnline;
  const now = robotTelemetry.now;
  const battery = getBatteryDisplay(telemetry?.power ?? {
    source: '3S_18650_BATTERY_HOLDER',
    packVoltage: null,
    batteryPercent: null,
    note: 'Chưa đo điện áp pin',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Robot AGV"
        description="Chi tiết phần cứng robot thật: ESP32-S3, UNO/UART, L298N, line sensor, siêu âm, encoder, MPU, camera và cánh tay MG90S."
        action={<EmergencyStopButton compact />}
      />

      <SectionCard title="Robot đã đăng ký" description="Robot chỉ Online khi có heartbeat/telemetry thật từ ESP32-S3 trong 5 giây gần nhất.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {robotTelemetry.registeredRobots.map(robot => {
            const itemTelemetry = robotTelemetry.telemetryByRobotId[robot.robotId];
            const itemOnline = robot.robotId === selectedRobotId
              ? online
              : Boolean(itemTelemetry && now - (itemTelemetry.receivedAt ?? itemTelemetry.timestamp) <= 5000);
            return (
              <button
                key={robot.robotId}
                onClick={() => onSelectRobot(robot.robotId)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  robot.robotId === selectedRobotId ? 'border-blue-200 bg-blue-50' : 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0F172A]">{robot.name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{robot.robotId}</p>
                    <p className="mt-2 text-xs text-[#64748B]">{robot.hardwareNote || robot.type}</p>
                  </div>
                  <StatusBadge tone={itemOnline ? 'green' : 'red'} dot>{itemOnline ? 'Trực tuyến' : 'Mất kết nối'}</StatusBadge>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {!telemetry ? (
        <SectionCard title="Đang chờ dữ liệu robot" description={`Robot ${selectedRobot?.robotId ?? DEFAULT_ROBOT_ID} đang chờ telemetry từ ESP32-S3 hoặc simulator.`}>
          <p className="mb-2 text-sm text-[#64748B]">Đang chờ dữ liệu từ ESP32-S3. Có thể chạy robot_telemetry_simulator.py để demo.</p>
          <p className="text-sm text-[#64748B]">Endpoint telemetry: <span className="font-mono text-[#0F172A]">POST /api/robot/telemetry</span></p>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RobotStatus title="Robot" value={online ? 'Robot đang trực tuyến' : 'Robot mất kết nối'} detail={telemetry.robotId} icon={online ? Wifi : WifiOff} tone={online ? 'green' : 'red'} />
            <RobotStatus title="Trạng thái" value={translateRobotState(telemetry.state)} detail={telemetry.mode === 'SIMULATOR' ? 'Đang dùng dữ liệu mô phỏng' : telemetry.mode} icon={Bot} tone={telemetry.state === 'EMERGENCY_STOP' ? 'red' : 'blue'} />
            <RobotStatus title="Node / Cạnh" value={telemetry.motion.currentNode ?? 'Chưa có'} detail={telemetry.motion.currentEdge ?? 'Chưa vào cạnh'} icon={Route} tone="slate" />
            <RobotStatus title="Pin" value={battery.percentLabel} detail={`${battery.voltageLabel} - ${battery.label}`} icon={Battery} tone={battery.tone} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HardwareGroup
              title="1. Bộ điều khiển"
              description="Kết nối điều khiển chính và phụ."
              icon={Cpu}
              items={[
                ['ESP32-S3-N16R8', boolText(telemetry.connection.esp32), telemetry.connection.esp32 ? 'green' : 'red'],
                ['UNO R3', nullableBoolText(telemetry.connection.uno), telemetry.connection.uno === false ? 'red' : telemetry.connection.uno ? 'green' : 'slate'],
                ['UART', nullableBoolText(telemetry.connection.uart), telemetry.connection.uart === false ? 'red' : telemetry.connection.uart ? 'green' : 'slate'],
                ['WiFi', boolText(telemetry.connection.wifi), telemetry.connection.wifi ? 'green' : 'red'],
                ['Liên kết server', boolText(telemetry.connection.server), telemetry.connection.server ? 'green' : 'red'],
              ]}
            />

            <HardwareGroup
              title="2. Cảm biến line và vật cản"
              description="3 cảm biến hồng ngoại dò line và siêu âm phía trước."
              icon={Radar}
              items={[
                ['IR_LEFT', String(telemetry.line.irLeft), 'slate'],
                ['IR_CENTER', String(telemetry.line.irCenter), 'slate'],
                ['IR_RIGHT', String(telemetry.line.irRight), 'slate'],
                ['Trạng thái line', translateRobotState(telemetry.line.lineStatus), telemetry.line.lineStatus === 'LOST_LINE' ? 'red' : 'green'],
                ['Siêu âm phía trước', telemetry.obstacle.ultrasonicDistance == null ? 'Chưa có' : `${telemetry.obstacle.ultrasonicDistance.toFixed(0)} cm`, distanceTone(telemetry.obstacle.ultrasonicDistance)],
                ['Trạng thái vật cản', translateRobotState(telemetry.obstacle.status), distanceTone(telemetry.obstacle.ultrasonicDistance)],
              ]}
            />

            <HardwareGroup
              title="3. Encoder và MPU"
              description="Odometry ước lượng từ encoder + MPU; có thể bị sai số trôi nếu không có AprilTag/UWB/marker reset."
              icon={Gauge}
              items={[
                ['Xung encoder trái', formatNumber(telemetry.encoder.leftTicks, 0), telemetry.encoder.status === 'OK' ? 'green' : 'amber'],
                ['Xung encoder phải', formatNumber(telemetry.encoder.rightTicks, 0), telemetry.encoder.status === 'OK' ? 'green' : 'amber'],
                ['Quãng đường trái', `${formatNumber(telemetry.encoder.leftDistanceCm)} cm`, 'slate'],
                ['Quãng đường phải', `${formatNumber(telemetry.encoder.rightDistanceCm)} cm`, 'slate'],
                ['Tổng quãng đường', `${formatNumber(telemetry.encoder.distanceTravelledCm)} cm`, 'slate'],
                ['Ước lượng vận tốc thẳng', `${formatNumber(telemetry.encoder.linearVelocityCms)} cm/s`, 'blue'],
                ['Ước lượng vận tốc góc', `${formatNumber(telemetry.encoder.angularVelocityDegs)} deg/s`, 'blue'],
                ['Kết nối MPU', nullableBoolText(telemetry.mpu.connected), telemetry.mpu.connected ? 'green' : 'red'],
                ['Góc yaw / theta', `${formatNumber(telemetry.mpu.yawDeg)} deg`, 'slate'],
                ['GyroZ', `${formatNumber(telemetry.mpu.gyroZ)} deg/s`, 'slate'],
                ['Trạng thái hướng', translateRobotState(telemetry.mpu.headingStatus), telemetry.mpu.headingStatus === 'OK' ? 'green' : 'amber'],
                ['Sai số odometry', telemetry.localization.driftWarning ? 'Có cảnh báo' : 'Bình thường', telemetry.localization.driftWarning ? 'amber' : 'green'],
              ]}
            />

            <HardwareGroup
              title="4. Hệ truyền động"
              description="Chỉ hiển thị lệnh/PWM motor vì robot chưa có cảm biến dòng motor."
              icon={Activity}
              items={[
                ['Trạng thái L298N', translateRobotState(telemetry.motion.l298n), telemetry.motion.l298n === 'OK' ? 'green' : 'amber'],
                ['Lệnh/PWM motor trái', formatNumber(telemetry.motion.leftMotorCommand, 0), 'blue'],
                ['Lệnh/PWM motor phải', formatNumber(telemetry.motion.rightMotorCommand, 0), 'blue'],
                ['Nguồn vận tốc', 'Ước lượng từ encoder', 'slate'],
                ['Dòng motor', 'Không hiển thị - chưa có cảm biến dòng', 'slate'],
              ]}
            />

            <HardwareGroup
              title="5. Cánh tay robot"
              description="MG90S không có feedback vị trí thật, chỉ hiển thị góc lệnh điều khiển servo."
              icon={Radio}
              items={[
                ['Góc lệnh servo đế', `${formatNumber(telemetry.arm.base)} deg`, 'slate'],
                ['Góc lệnh servo vai', `${formatNumber(telemetry.arm.shoulder)} deg`, 'slate'],
                ['Góc lệnh servo khuỷu', `${formatNumber(telemetry.arm.elbow)} deg`, 'slate'],
                ['Góc lệnh servo kẹp', `${formatNumber(telemetry.arm.gripper)} deg`, 'slate'],
                ['Đang giữ hàng', telemetry.arm.holdingItem ? 'Có' : 'Không', telemetry.arm.holdingItem ? 'green' : 'slate'],
              ]}
            />

            <HardwareGroup
              title="6. Camera và nguồn"
              description="Camera mặc định EVENT_SNAPSHOT; pin chỉ hiện ước lượng nếu có packVoltage."
              icon={Camera}
              items={[
                ['Kết nối camera', nullableBoolText(telemetry.camera.connected), telemetry.camera.connected ? 'green' : 'red'],
                ['Chế độ camera', translateRobotState(telemetry.camera.mode), telemetry.camera.mode === 'EVENT_SNAPSHOT' ? 'green' : 'slate'],
                ['Màu phát hiện gần nhất', telemetry.camera.lastDetectedColor ?? 'Chưa có', telemetry.camera.lastDetectedColor ? 'blue' : 'slate'],
                ['Thời điểm frame gần nhất', telemetry.camera.lastFrameAt ? new Date(telemetry.camera.lastFrameAt).toLocaleTimeString('vi-VN') : 'Chưa có', 'slate'],
                ['Nguồn cấp', translateRobotState(telemetry.power.source), 'slate'],
                ['Điện áp pack', battery.voltageLabel, battery.tone],
                ['Phần trăm pin', battery.percentLabel, battery.tone],
                ['Ghi chú pin', battery.note, 'slate'],
              ]}
            />
          </div>

          <SectionCard title="Tư thế ước lượng" description="Vị trí được ước lượng từ encoder + MPU, có thể bị sai số trôi nếu không có mốc reset như AprilTag/UWB/marker.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Mini label="Tọa độ X ước lượng" value={formatNumber(telemetry.localization.estimatedX)} />
              <Mini label="Tọa độ Y ước lượng" value={formatNumber(telemetry.localization.estimatedY)} />
              <Mini label="Góc theta ước lượng" value={`${formatNumber(telemetry.localization.estimatedTheta)} deg`} />
              <Mini label="Độ tin cậy" value={telemetry.localization.confidence} />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function RobotStatus({ title, value, detail, icon: Icon, tone }: { title: string; value: string; detail: string; icon: ElementType; tone: Tone }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#64748B]">{title}</p>
          <p className="mt-2 break-words text-xl font-bold text-[#0F172A]">{value}</p>
          <p className="mt-1 break-words text-xs text-[#64748B]">{detail}</p>
        </div>
        <span className={`rounded-xl p-2 ${toneClass(tone)}`}><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

function HardwareGroup({ title, description, icon: Icon, items }: { title: string; description: string; icon: ElementType; items: Array<[string, string, Tone]> }) {
  return (
    <SectionCard title={title} description={description} icon={<Icon className="h-4 w-4 text-[#2563EB]" />}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border border-[#E2E8F0] bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase text-[#64748B]">{label}</p>
              <StatusBadge tone={tone === 'blue' ? 'blue' : tone}>{badgeLabel(tone)}</StatusBadge>
            </div>
            <p className="mt-2 break-words text-sm font-bold text-[#0F172A]">{value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3">
      <p className="text-xs font-bold uppercase text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function formatNumber(value: number | null | undefined, fractionDigits = 1) {
  return value == null ? 'Chưa có' : value.toFixed(fractionDigits);
}

function boolText(value: boolean) {
  return value ? 'Trực tuyến' : 'Mất kết nối';
}

function nullableBoolText(value: boolean | null) {
  if (value == null) return 'Chưa rõ';
  return value ? 'Đã kết nối' : 'Mất kết nối';
}

function distanceTone(value: RobotHardwareTelemetry['obstacle']['ultrasonicDistance']): Tone {
  if (value == null) return 'slate';
  if (value < 30) return 'red';
  if (value < 50) return 'amber';
  return 'green';
}

function toneClass(tone: Tone) {
  if (tone === 'green') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'amber') return 'bg-amber-50 text-amber-700';
  if (tone === 'red') return 'bg-red-50 text-red-700';
  if (tone === 'blue') return 'bg-blue-50 text-blue-700';
  return 'bg-slate-50 text-slate-700';
}

function badgeLabel(tone: Tone) {
  if (tone === 'green') return 'OK';
  if (tone === 'amber') return 'Cảnh báo';
  if (tone === 'red') return 'Lỗi';
  if (tone === 'blue') return 'Ước lượng';
  return 'Thông tin';
}

function translateRobotState(state: string) {
  const labels: Record<string, string> = {
    FOLLOW_LINE: 'Dò line',
    RESUME_LINE: 'Tiếp tục dò line',
    WAITING_TASK: 'Đang chờ nhiệm vụ',
    MOVING_ON_EDGE: 'Đang di chuyển',
    EMERGENCY_STOP: 'Dừng khẩn cấp',
    EMERGENCY_STOP_PERSON: 'Dừng khẩn cấp do người',
    STOP_AND_RECHECK: 'Dừng và kiểm tra lại',
    STOP_AND_SCAN: 'Dừng và quét vật cản',
    SLOW_DOWN_AND_MONITOR: 'Giảm tốc và theo dõi',
    BLOCKED_PATH: 'Đường bị chặn',
    WAIT: 'Chờ',
    YIELD_OR_WAIT: 'Nhường đường hoặc chờ',
    OK: 'Bình thường',
    UNKNOWN: 'Chưa rõ',
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    CLEAR: 'Không có vật cản',
    OBSTACLE: 'Có vật cản',
    NORMAL_LINE: 'Line bình thường',
    LOST_LINE: 'Mất line',
    EVENT_SNAPSHOT: 'Chụp theo sự kiện',
    ESP32_CAM: 'ESP32-CAM',
    CAMERA_STREAM: 'Luồng camera',
    '3S_18650_BATTERY_HOLDER': 'Khay pin 3S 18650',
  };
  return labels[state] ?? state;
}
