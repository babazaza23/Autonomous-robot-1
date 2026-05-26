import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  Palette,
  Plug,
  ScanLine,
  Server,
  Shapes,
  Unplug,
  WifiOff,
} from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { useVisionServer } from '../hooks/useVisionServer';
import type { VisionDetection, VisionResult } from '../hooks/useVisionServer';
import { classifyCargo } from '../utils/classifyCargo';
import { CargoColor, CargoShape } from '../types/inventory';
import { DEFAULT_ROBOT_ID, RegisteredRobot } from '../types/robot';
import { DEFAULT_AI_SERVER_HOST } from '../hooks/useVisionServer';

interface CameraPageProps {
  selectedRobotId?: string;
  robots?: RegisteredRobot[];
  onSelectRobot?: (robotId: string) => void;
  onVisionAlert?: (result: VisionResult) => void;
  onServerHostChange?: (host: string) => void;
}

interface LocalVisionLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  event: string;
  message: string;
}

interface FrameSize {
  width: number;
  height: number;
}

interface RenderRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const colors: CargoColor[] = ['red', 'blue', 'yellow'];
const shapes: CargoShape[] = ['cube'];

const colorSwatches: Record<CargoColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  white: '#f8fafc',
  black: '#111827',
};

const colorLabels: Record<CargoColor, string> = {
  red: 'Đỏ',
  blue: 'Xanh dương',
  green: 'Xanh lá',
  yellow: 'Vàng',
  white: 'Trắng',
  black: 'Đen',
};

const shapeLabels: Record<CargoShape, string> = {
  cube: 'Khối vuông',
  triangle: 'Tam giác',
  circle: 'Hình tròn',
  box: 'Hộp',
  cylinder: 'Trụ',
  sphere: 'Cầu',
};

const categoryLabels = {
  electronics: 'Điện tử',
  chemicals: 'Hóa chất',
  food: 'Thực phẩm',
  fragile: 'Dễ vỡ',
  general: 'Khac',
  color_block: 'Khối màu',
};

export default function CameraPage({
  selectedRobotId = DEFAULT_ROBOT_ID,
  robots = [],
  onSelectRobot,
  onVisionAlert,
  onServerHostChange,
}: CameraPageProps) {
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('wms-ai-server-host') || DEFAULT_AI_SERVER_HOST);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const { connected, result: visionResult, imageSrc, error } = useVisionServer(serverHost, visionEnabled, selectedRobotId);
  const [logs, setLogs] = useState<LocalVisionLog[]>([]);
  const [selectedColor, setSelectedColor] = useState<CargoColor>('red');
  const [selectedShape, setSelectedShape] = useState<CargoShape>('cube');
  const [result, setResult] = useState<ReturnType<typeof classifyCargo> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const previousConnectedRef = useRef(false);
  const lastFrameTimestampRef = useRef<number | null>(null);
  const lastAlertTimestampRef = useRef<number | null>(null);

  const previewStyle = useMemo(() => getShapeStyle(selectedShape, colorSwatches[selectedColor]), [selectedColor, selectedShape]);

  const addLog = (event: string, message: string, level: LocalVisionLog['level'] = 'info') => {
    setLogs(prev => [
      {
        id: `${event}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: Date.now(),
        level,
        event,
        message,
      },
      ...prev,
    ].slice(0, 30));
  };

  useEffect(() => {
    localStorage.setItem('wms-ai-server-host', serverHost);
    onServerHostChange?.(serverHost);
  }, [onServerHostChange, serverHost]);

  useEffect(() => {
    if (connected && !previousConnectedRef.current) {
      addLog('AI_SERVER_CONNECTED', `Đã kết nối AI Server ${serverHost}`);
    }

    if (!connected && previousConnectedRef.current) {
      addLog('AI_SERVER_DISCONNECTED', `Mất kết nối AI Server ${serverHost}`, 'warning');
    }

    previousConnectedRef.current = connected;
  }, [connected, serverHost]);

  useEffect(() => {
    if (!visionResult || lastFrameTimestampRef.current === visionResult.timestamp) return;

    lastFrameTimestampRef.current = visionResult.timestamp;
    const timer = window.setTimeout(() => {
      addLog('FRAME_RECEIVED', `Đã nhận frame từ ${visionResult.robotId}`);

      if (visionResult.alert) {
        const level = visionResult.alert.level === 'HIGH' || visionResult.alert.level === 'CRITICAL' ? 'error' : 'warning';
        addLog(visionResult.alert.type, visionResult.alert.message, level);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [visionResult]);

  useEffect(() => {
    if (!visionResult?.alert || lastAlertTimestampRef.current === visionResult.timestamp) return;

    lastAlertTimestampRef.current = visionResult.timestamp;
    onVisionAlert?.(visionResult);
  }, [onVisionAlert, visionResult]);

  const handleConnectToggle = () => {
    if (!serverHost.trim()) return;
    setVisionEnabled(current => !current);
  };

  const handleClassify = () => {
    setIsScanning(true);
    setTimeout(() => {
      setResult(classifyCargo(selectedColor, selectedShape));
      setIsScanning(false);
    }, 800);
  };

  const activeResult = visionResult && Number.isFinite(visionResult.timestamp) && visionResult.timestamp > 0 ? visionResult : null;
  const activeAlert = activeResult?.alert ?? null;
  const detections = activeResult?.detected ? activeResult.detections : [];
  const latestFrameOk = Boolean(imageSrc && activeResult?.timestamp);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Camera và AI Vision"
        description="ESP32-S3 hoặc webcam laptop gửi JPEG lên AI Server; YOLO/OpenCV xử lý và WMS nhận kết quả thời gian thực qua WebSocket."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={connected ? 'green' : 'slate'} dot>
              {connected ? 'AI Server đã kết nối' : 'AI Server mất kết nối'}
            </StatusBadge>
            <StatusBadge tone={latestFrameOk ? 'green' : 'amber'}>
              {latestFrameOk ? 'Đã có ảnh mới nhất' : 'Chưa nhận được ảnh'}
            </StatusBadge>
          </div>
        }
      />

      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label htmlFor="ai-server-host" className="text-xs font-semibold uppercase text-surface-500">
              Địa chỉ AI Server
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
              <Server className="h-4 w-4 text-[#64748B]" />
              <input
                id="ai-server-host"
                value={serverHost}
                onChange={event => setServerHost(event.target.value)}
                placeholder="127.0.0.1:8000"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
              />
            </div>
          </div>
          <div className="w-full lg:w-56">
            <label htmlFor="camera-robot-id" className="text-xs font-semibold uppercase text-surface-500">
              Robot đang xem
            </label>
            <select
              id="camera-robot-id"
              value={selectedRobotId}
              onChange={event => onSelectRobot?.(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A]"
            >
              {(robots.length ? robots : [{ robotId: selectedRobotId, name: selectedRobotId } as RegisteredRobot]).map(robot => (
                <option key={robot.robotId} value={robot.robotId}>{robot.name || robot.robotId}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleConnectToggle}
            disabled={!serverHost.trim()}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${
              visionEnabled ? 'bg-[#0F172A] text-white hover:bg-slate-700' : 'bg-[#2563EB] text-white hover:bg-blue-700'
            }`}
          >
            {visionEnabled ? <Unplug className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
            {visionEnabled ? 'Ngắt kết nối' : 'Kết nối'}
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs leading-relaxed text-[#475569]">
          <p className="font-semibold text-[#0F172A]">Test bằng webcam laptop</p>
          <p className="mt-1">1) Chạy AI Server: <span className="font-mono">uvicorn main:app --host 0.0.0.0 --port 8000</span></p>
          <p>2) Chạy webcam client: <span className="font-mono">python webcam_client.py</span></p>
          <p>3) Ô ở trên nhập <span className="font-mono">127.0.0.1:8000</span> roi bam Kết nối.</p>
          <p className="mt-2">Chế độ camera mặc định: <span className="font-mono">EVENT_SNAPSHOT</span>. Tùy chọn giám sát thấp: <span className="font-mono">LOW_FPS_MONITORING</span> tối đa 1-2 FPS.</p>
        </div>
        {error && <p className="mt-3 text-xs text-orange-500">{error}</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)] gap-6">
        <div className="space-y-6">
          <div className="glass-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-200">
                <Camera className="h-4 w-4 text-info" /> Ảnh mới nhất từ AI Server
              </h3>
              <span className="mono text-[11px] text-surface-500">{activeResult ? new Date(activeResult.timestamp).toLocaleTimeString('vi-VN') : 'đang chờ'}</span>
            </div>

            <VisionFrame imageSrc={imageSrc} detections={detections} />
          </div>

          {!connected && (
            <div className="glass-card p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-200">
                <Eye className="h-4 w-4 text-info" /> Demo nhận diện khối màu
              </h3>
              <FallbackSimulation
                selectedColor={selectedColor}
                selectedShape={selectedShape}
                result={result}
                isScanning={isScanning}
                previewStyle={previewStyle}
                onColorChange={setSelectedColor}
                onShapeChange={setSelectedShape}
                onClassify={handleClassify}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AlertPanel alert={activeAlert} />
          <DetectionPanel detections={detections} />
          <LocalLogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}

function VisionFrame({ imageSrc, detections }: { imageSrc: string | null; detections: VisionDetection[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize | null>(null);
  const [renderRect, setRenderRect] = useState<RenderRect | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setImageFailed(false), 0);
    return () => window.clearTimeout(timer);
  }, [imageSrc]);

  useEffect(() => {
    const updateRenderRect = () => {
      if (!containerRef.current || !frameSize) return;
      setRenderRect(getObjectContainRect(containerRef.current, frameSize));
    };

    updateRenderRect();
    window.addEventListener('resize', updateRenderRect);
    return () => window.removeEventListener('resize', updateRenderRect);
  }, [frameSize, imageSrc]);

  const hasImage = imageSrc && !imageFailed;

  return (
    <div ref={containerRef} className="relative aspect-video overflow-hidden rounded-lg border border-surface-700 bg-black">
      {hasImage ? (
        <>
          <img
            src={imageSrc}
            alt="Ảnh mới nhất từ ESP32-S3"
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={event => {
              setFrameSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
            }}
            onError={() => setImageFailed(true)}
          />
          {renderRect && frameSize && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: renderRect.left,
                top: renderRect.top,
                width: renderRect.width,
                height: renderRect.height,
              }}
            >
              {detections.map((detection, index) => {
                const left = (detection.bbox.x / frameSize.width) * 100;
                const top = (detection.bbox.y / frameSize.height) * 100;
                const width = (detection.bbox.w / frameSize.width) * 100;
                const height = (detection.bbox.h / frameSize.height) * 100;
                const critical = detection.level === 'CRITICAL' || detection.action === 'EMERGENCY_STOP';
                const high = detection.level === 'HIGH';
                const moving = detection.type === 'OBSTACLE_MOVING';
                const boxClass = critical
                  ? 'border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]'
                  : moving || high
                    ? 'border-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.4)]'
                    : 'border-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.35)]';
                const labelClass = critical ? 'bg-red-500 text-white' : moving || high ? 'bg-orange-400 text-black' : 'bg-yellow-300 text-black';

                return (
                  <div
                    key={`${detection.type}-${detection.label}-${index}`}
                    className={`absolute border-2 ${boxClass}`}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  >
                    <span className={`absolute left-0 top-0 -translate-y-full whitespace-nowrap px-2 py-1 text-[10px] font-bold ${labelClass}`}>
                      {detection.label} {(detection.confidence * 100).toFixed(0)}% {detection.action ? ` - ${detection.action}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <EmptyState
            icon={WifiOff}
            title="Chưa nhận được ảnh tu webcam/ESP32-S3"
            description="Hãy chạy AI Server và gửi JPEG đến /api/frame bằng HTTP POST."
          />
        </div>
      )}
    </div>
  );
}

function getObjectContainRect(container: HTMLDivElement, frameSize: FrameSize): RenderRect {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const containerRatio = containerWidth / Math.max(containerHeight, 1);
  const imageRatio = frameSize.width / Math.max(frameSize.height, 1);

  if (imageRatio > containerRatio) {
    const width = containerWidth;
    const height = containerWidth / imageRatio;
    return { left: 0, top: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = containerHeight * imageRatio;
  return { left: (containerWidth - width) / 2, top: 0, width, height };
}

function AlertPanel({ alert }: { alert: VisionResult['alert'] }) {
  if (!alert) {
    return (
      <div className="glass-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
          <AlertTriangle className="h-4 w-4 text-surface-400" /> Cảnh báo Vision
        </h3>
        <p className="text-sm text-surface-500">Chưa có cảnh báo từ AI Server.</p>
      </div>
    );
  }

  const critical = alert.level === 'CRITICAL' || alert.action === 'EMERGENCY_STOP';
  const high = alert.level === 'HIGH';
  return (
    <div className={`glass-card p-4 border ${critical ? 'border-red-500/50 bg-red-500/15' : high ? 'border-orange-400/40 bg-orange-400/10' : 'border-yellow-300/40 bg-yellow-300/10'}`}>
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${critical ? 'text-red-300' : high ? 'text-orange-300' : 'text-yellow-200'}`}>
        <AlertTriangle className="h-4 w-4" /> {translateLevel(alert.level)} - {translateDetectionType(alert.type)}
      </h3>
      <p className="text-sm text-white">{alert.message}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <InfoPill label="Hành động" value={translateRobotAction(alert.action) || '-'} urgent={critical} />
        <InfoPill label="Rẽ" value={alert.turnDirection ? `${translateDirection(alert.turnDirection)}${typeof alert.turnAngle === 'number' ? ` ${alert.turnAngle} do` : ''}` : '-'} />
        <InfoPill label="Kiểm tra lại" value={typeof alert.recheckAfterMs === 'number' ? `${alert.recheckAfterMs}ms` : '-'} />
        <InfoPill label="Sự kiện" value={translateDetectionType(alert.type)} />
      </div>
    </div>
  );
}

function InfoPill({ label, value, urgent = false }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${urgent ? 'border-red-500/40 bg-red-500/10' : 'border-surface-700 bg-surface-900'}`}>
      <p className="text-[10px] uppercase text-surface-500">{label}</p>
      <p className={`mt-1 font-semibold ${urgent ? 'text-red-200' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function DetectionPanel({ detections }: { detections: VisionDetection[] }) {
  return (
    <div className="glass-card p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-200">
        <Activity className="h-4 w-4 text-info" /> Nhận diện
      </h3>
      <div className="space-y-2">
        {detections.map((detection, index) => (
          <DetectionCard key={`${detection.type}-${index}`} detection={detection} />
        ))}
        {detections.length === 0 && <p className="text-sm text-surface-500">Chưa phát hiện người hoặc vật cản lớn.</p>}
      </div>
    </div>
  );
}

function DetectionCard({ detection }: { detection: VisionDetection }) {
  const critical = detection.level === 'CRITICAL' || detection.action === 'EMERGENCY_STOP';
  const moving = detection.type === 'OBSTACLE_MOVING';
  const badgeClass = critical
    ? 'bg-red-500/20 text-red-300'
    : moving
      ? detection.level === 'HIGH'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-orange-400/15 text-orange-300'
      : 'bg-yellow-300/15 text-yellow-200';
  const turnText = detection.turnDirection
    ? `${translateDirection(detection.turnDirection)}${typeof detection.turnAngle === 'number' ? ` ${detection.turnAngle} do` : ''}`
    : '-';

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`status-badge ${badgeClass}`}>{translateLevel(detection.level)}</span>
        <span className="mono text-[11px] text-surface-400">{(detection.confidence * 100).toFixed(1)}%</span>
      </div>
      <p className="text-sm font-semibold text-white">{translateDetectionType(detection.type)}</p>
      <p className="mt-1 text-xs text-surface-400">
        Loại: {translateDetectionType(detection.type)} · Nguồn: {detection.debug?.source ?? detection.source}
        {detection.trackId ? ` · Mã theo dõi #${detection.trackId}` : ''}
      </p>
      {detection.motion && (
        <p className={`mt-2 text-xs font-semibold ${detection.motion.moving ? 'text-amber-300' : 'text-emerald-300'}`}>
          {detection.motion.moving
            ? `Đang di chuyển ${translateDirection(detection.motion.direction)}, ${detection.motion.speedPxPerSec.toFixed(0)}px/s`
            : `Đứng yên, ${detection.motion.speedPxPerSec.toFixed(0)}px/s`}
        </p>
      )}
      {detection.action && (
        <div className={`mt-3 rounded-md border p-2 text-xs ${critical ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-surface-700 bg-black/20 text-surface-200'}`}>
          <p className="font-semibold">
            Hành động: {translateRobotAction(detection.action)}
            {detection.action === 'TURN_LEFT' ? ' ←' : detection.action === 'TURN_RIGHT' ? ' →' : ''}
          </p>
          <p className="mt-1 text-surface-400">
            Rẽ: {turnText} - Kiểm tra lại: {typeof detection.recheckAfterMs === 'number' ? `${detection.recheckAfterMs}ms` : '-'}
          </p>
          {detection.message && <p className="mt-1 text-surface-300">{detection.message}</p>}
        </div>
      )}
      <p className="mt-2 mono text-[10px] text-surface-500">
        dữ liệu gốc:{detection.rawLabel} x:{detection.bbox.x} y:{detection.bbox.y} w:{detection.bbox.w} h:{detection.bbox.h} area:{(detection.areaRatio * 100).toFixed(1)}%
      </p>
      {detection.debug && (
        <p className="mt-1 mono text-[10px] text-surface-500">
          gỡ lỗi:{detection.debug.source} roi:{String(detection.debug.roiPassed)} bg:{String(detection.debug.backgroundCalibrated)}
        </p>
      )}
    </div>
  );
}
function LocalLogPanel({ logs }: { logs: LocalVisionLog[] }) {
  const levelStyles: Record<LocalVisionLog['level'], string> = {
    info: 'bg-info/10 text-info',
    warning: 'bg-orange-400/15 text-orange-300',
    error: 'bg-red-500/15 text-red-300',
  };

  return (
    <div className="glass-card p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-surface-200">
        <ScanLine className="h-4 w-4 text-info" /> Nhật ký Vision
      </h3>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {logs.map(log => (
          <div key={log.id} className="rounded-lg border border-surface-700 bg-surface-900 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={`status-badge ${levelStyles[log.level]}`}>{logLevelLabel(log.level)}</span>
              <span className="mono text-[10px] text-surface-500">{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
            </div>
            <p className="mono text-[11px] text-surface-300">{log.event}</p>
            <p className="mt-1 text-xs text-surface-400">{log.message}</p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-surface-500">Chưa có log từ Vision Server.</p>}
      </div>
    </div>
  );
}

function FallbackSimulation({
  selectedColor,
  selectedShape,
  result,
  isScanning,
  previewStyle,
  onColorChange,
  onShapeChange,
  onClassify,
}: {
  selectedColor: CargoColor;
  selectedShape: CargoShape;
  result: ReturnType<typeof classifyCargo> | null;
  isScanning: boolean;
  previewStyle: CSSProperties;
  onColorChange: (color: CargoColor) => void;
  onShapeChange: (shape: CargoShape) => void;
  onClassify: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] gap-4">
      <div className="space-y-4">
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
            <Palette className="h-4 w-4 text-accent" /> Màu vật phẩm
          </h4>
          <div className="grid grid-cols-6 gap-2">
            {colors.map(color => (
              <button
                key={color}
                title={colorLabels[color]}
                onClick={() => onColorChange(color)}
                className={`flex aspect-square items-center justify-center rounded-lg border-2 transition-all ${
                  selectedColor === color ? 'scale-105 border-white' : 'border-surface-700 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: colorSwatches[color] }}
              >
                {selectedColor === color && <CheckCircle2 className={`h-4 w-4 ${color === 'white' || color === 'yellow' ? 'text-black' : 'text-white'}`} />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-surface-400">{colorLabels[selectedColor]}</p>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-surface-200">
            <Shapes className="h-4 w-4 text-warning" /> Hình dạng cơ bản
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {shapes.map(shape => (
              <button
                key={shape}
                onClick={() => onShapeChange(shape)}
                className={`rounded-lg border p-4 text-center transition-all ${
                  selectedShape === shape ? 'border-white bg-white/10' : 'border-surface-700 bg-surface-700/30 hover:bg-surface-700/50'
                }`}
              >
                <ShapePreview shape={shape} color={colorSwatches[selectedColor]} small />
                <p className="mt-3 text-xs text-surface-300">{shapeLabels[shape]}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex h-44 items-center justify-center rounded-lg border border-surface-700 bg-surface-900">
          <div className={`transition-all duration-300 ${isScanning ? 'scale-110 animate-pulse' : ''}`}>
            <div style={previewStyle} />
          </div>
        </div>
        <button
          onClick={onClassify}
          disabled={isScanning}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black transition-all hover:bg-surface-200 disabled:opacity-50"
        >
          <ScanLine className="h-4 w-4" />
          {isScanning ? 'Đang nhận diện...' : 'Nhận diện hang hoa'}
        </button>

        {result && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 animate-slide-in">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Eye className="h-4 w-4" /> Kết quả mô phỏng
            </h4>
            <div className="space-y-2 text-xs">
              <InfoRow label="Màu nhận diện" value={colorLabels[result.color]} />
              <InfoRow label="Hình dạng" value={shapeLabels[result.shape]} />
              <InfoRow label="Nhóm hàng" value={categoryLabels[result.category]} />
              <InfoRow label="Node thả đề xuất" value={result.dropNode ?? 'UNKNOWN_COLOR'} />
              <InfoRow label="Khu thả đề xuất" value={result.dropZone ?? 'Cần xác nhận thủ công'} />
              <InfoRow label="Độ tin cậy" value={`${(result.confidence * 100).toFixed(1)}%`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShapePreview({ shape, color, small = false }: { shape: CargoShape; color: string; small?: boolean }) {
  const size = small ? 44 : 96;
  return <div className="mx-auto" style={getShapeStyle(shape, color, size)} />;
}

function getShapeStyle(shape: CargoShape, color: string, size = 96): CSSProperties {
  if (shape === 'triangle') {
    return {
      width: 0,
      height: 0,
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
      filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))',
    };
  }

  return {
    width: size,
    height: size,
    borderRadius: shape === 'circle' || shape === 'sphere' ? '9999px' : 10,
    backgroundColor: color,
    border: '2px solid rgba(255,255,255,0.45)',
    boxShadow: '0 14px 28px rgba(0,0,0,0.35)',
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-surface-700/40 py-1.5">
      <span className="text-surface-500">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function translateDetectionType(type: string) {
  const labels: Record<string, string> = {
    PERSON_MOVING: 'Phát hiện người trong vùng dừng',
    PERSON_NEAR_PATH: 'Người gần vùng đường đi',
    OBSTACLE_MOVING: 'Vật cản đang di chuyển',
    OBSTACLE_STATIC: 'Vật cản đứng yên',
  };
  return labels[type] ?? type;
}

function translateRobotAction(action?: string | null) {
  if (!action) return '';
  const labels: Record<string, string> = {
    FOLLOW_LINE: 'Dò line',
    RESUME_LINE: 'Tiếp tục dò line',
    EMERGENCY_STOP: 'Dừng khẩn cấp',
    EMERGENCY_STOP_PERSON: 'Dừng khẩn cấp do người',
    STOP_AND_RECHECK: 'Dừng và kiểm tra lại',
    STOP_AND_SCAN: 'Dừng và quét vật cản',
    SLOW_DOWN_AND_MONITOR: 'Giảm tốc và theo dõi',
    SLOW_DOWN_AND_SCAN: 'Giảm tốc và quét lại',
    BLOCKED_PATH: 'Đường bị chặn',
    WAIT: 'Chờ',
    YIELD_OR_WAIT: 'Nhường đường hoặc chờ',
    TURN_LEFT: 'Rẽ trái',
    TURN_RIGHT: 'Rẽ phải',
  };
  return labels[action] ?? action;
}

function translateDirection(direction: string) {
  const labels: Record<string, string> = {
    LEFT: 'trái',
    RIGHT: 'phải',
    CENTER: 'giữa',
    left: 'trái',
    right: 'phải',
    up: 'lên',
    down: 'xuống',
    static: 'đứng yên',
    motion: 'trong vùng chuyển động',
    new: 'mới',
  };
  return labels[direction] ?? direction;
}

function translateLevel(level: string) {
  const labels: Record<string, string> = { CRITICAL: 'Nghiêm trọng', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp', info: 'Thông tin', warning: 'Cảnh báo', error: 'Lỗi' };
  return labels[level] ?? level;
}

function logLevelLabel(level: string) {
  const labels: Record<string, string> = { info: 'Thông tin', warning: 'Cảnh báo', error: 'Lỗi' };
  return labels[level] ?? level;
}
