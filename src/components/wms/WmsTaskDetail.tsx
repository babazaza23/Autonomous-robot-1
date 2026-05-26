import { CheckCircle2, PackageCheck, Send, Truck } from 'lucide-react';
import SectionCard from '../common/SectionCard';
import StatusBadge from '../common/StatusBadge';
import type { WmsTask, WmsTaskStatus } from '../../types/wms';
import {
  locationStatusLabel,
  wmsTaskResultLabel,
  wmsTaskResultTone,
  wmsTaskStatusLabel,
  wmsTaskStatusTone,
  wmsTaskTypeLabel,
} from '../../utils/statusLabels';
import ProofImagePanel from './ProofImagePanel';

const taskStatuses: WmsTaskStatus[] = [
  'CREATED',
  'GOING_TO_PICK',
  'PICK_PHOTO_UPLOADED',
  'PICKED',
  'MOVING_TO_DROP',
  'DROPPED',
  'DROP_PHOTO_UPLOADED',
  'COMPLETED',
];

interface WmsTaskDetailProps {
  task: WmsTask | null;
  locations: Array<{ locationId: string; name: string; status: string }>;
  actualLocationId: string;
  onActualLocationChange: (value: string) => void;
  onManualPickup: () => Promise<void>;
  onManualDrop: () => Promise<void>;
  resolveUploadUrl: (url?: string | null) => string | null;
  actionLoading: boolean;
}

export default function WmsTaskDetail({
  task,
  locations,
  actualLocationId,
  onActualLocationChange,
  onManualPickup,
  onManualDrop,
  resolveUploadUrl,
  actionLoading,
}: WmsTaskDetailProps) {
  if (!task) {
    return (
      <SectionCard title="Chi tiết nhiệm vụ" description="Chọn hoặc tạo một nhiệm vụ để xem timeline.">
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Chưa có nhiệm vụ được chọn.</p>
      </SectionCard>
    );
  }

  const activeIndex = task.status === 'FAILED' ? -1 : taskStatuses.indexOf(task.status);
  const result = task.result ?? 'PENDING_VERIFY';

  return (
    <SectionCard title="Chi tiết nhiệm vụ" description="Chế độ demo thủ công chỉ dùng khi chưa có tín hiệu từ ESP32-S3.">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-sm font-bold text-blue-600">{task.taskId}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{wmsTaskTypeLabel[task.type]} · {task.itemId}</h3>
            <p className="mt-1 text-sm text-slate-500">{task.fromLocationId} → {task.toLocationId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={wmsTaskStatusTone[task.status]}>{wmsTaskStatusLabel[task.status]}</StatusBadge>
            <StatusBadge tone={wmsTaskResultTone[result]}>{wmsTaskResultLabel[result]}</StatusBadge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {taskStatuses.map((status, index) => {
            const done = activeIndex >= index || task.status === 'COMPLETED';
            return (
              <div key={status} className={`rounded-xl border p-3 ${done ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <CheckCircle2 className={`h-4 w-4 ${done ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className={`mt-2 text-xs font-semibold ${done ? 'text-blue-700' : 'text-slate-500'}`}>{wmsTaskStatusLabel[status]}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProofImagePanel title="Ảnh lấy hàng" url={resolveUploadUrl(task.pickupProofImageUrl)} />
          <ProofImagePanel title="Ảnh thả hàng" url={resolveUploadUrl(task.dropProofImageUrl)} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
            <Truck className="h-4 w-4 text-blue-600" />
            Demo thủ công
          </div>
          <p className="mb-4 text-xs font-semibold text-slate-500">
            Chỉ dùng khi ESP32-S3 chưa gửi được ảnh pickup/drop thật. Hệ thống sẽ tạo ảnh placeholder và vẫn cập nhật WMS theo nghiệp vụ demo.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <button
              onClick={() => void onManualPickup()}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <PackageCheck className="h-4 w-4" />
              Xác nhận lấy hàng
            </button>
            <select value={actualLocationId} onChange={event => onActualLocationChange(event.target.value)} className="field-input">
              {locations.map(location => (
                <option key={location.locationId} value={location.locationId}>
                  {location.name} ({location.locationId}) · {locationStatusLabel[location.status as keyof typeof locationStatusLabel] ?? location.status}
                </option>
              ))}
            </select>
            <button
              onClick={() => void onManualDrop()}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Xác nhận thả hàng
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
