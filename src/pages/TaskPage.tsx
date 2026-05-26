import { ClipboardPlus, RefreshCw, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import WmsTaskDetail from '../components/wms/WmsTaskDetail';
import { useWms } from '../hooks/useWms';
import type {
  CreateWmsTaskPayload,
  WmsItemId,
  WmsTaskType,
} from '../types/wms';
import { itemOptions, wmsTaskResultLabel, wmsTaskResultTone, wmsTaskStatusLabel, wmsTaskStatusTone, wmsTaskTypeLabel } from '../utils/statusLabels';

interface TaskPageProps {
  serverHost?: string;
  selectedRobotId: string;
}

export default function TaskPage({ serverHost, selectedRobotId }: TaskPageProps) {
  const wms = useWms(serverHost, selectedRobotId);
  const [itemId, setItemId] = useState<WmsItemId>('ITEM-A');
  const [type, setType] = useState<WmsTaskType>('PUTAWAY');
  const [quantity, setQuantity] = useState(1);
  const [fromLocationId, setFromLocationId] = useState('INBOUND-01');
  const [toLocationId, setToLocationId] = useState('SHELF-A1');
  const [actualLocationId, setActualLocationId] = useState('SHELF-A1');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => wms.tasks.find(task => task.taskId === selectedTaskId) ?? wms.tasks[0] ?? null,
    [selectedTaskId, wms.tasks],
  );

  const shelfLocations = wms.locations.filter(location => location.locationId.startsWith('SHELF-'));
  const allLocations = wms.locations.length > 0 ? wms.locations : [
    { locationId: 'INBOUND-01', name: 'Bàn nhận hàng', zone: '', itemId: null, quantity: 0, capacity: 99, status: 'EMPTY' as const, lastUpdatedAt: 0 },
    { locationId: 'SHELF-A1', name: 'Kệ A1', zone: '', itemId: null, quantity: 0, capacity: 3, status: 'EMPTY' as const, lastUpdatedAt: 0 },
    { locationId: 'SHELF-B1', name: 'Kệ B1', zone: '', itemId: null, quantity: 0, capacity: 3, status: 'EMPTY' as const, lastUpdatedAt: 0 },
    { locationId: 'SHELF-C1', name: 'Kệ C1', zone: '', itemId: null, quantity: 0, capacity: 3, status: 'EMPTY' as const, lastUpdatedAt: 0 },
    { locationId: 'OUTBOUND-01', name: 'Bàn xuất hàng', zone: '', itemId: null, quantity: 0, capacity: 99, status: 'EMPTY' as const, lastUpdatedAt: 0 },
  ];

  const submitTask = async (payload: CreateWmsTaskPayload) => {
    const created = await wms.createTask(payload);
    if (created) {
      setSelectedTaskId(created.taskId);
      setNotice(`Đã tạo nhiệm vụ ${created.taskId} và đưa lệnh WMS_TASK vào hàng đợi của ${created.robotId}.`);
    }
  };

  const createFromForm = async () => {
    await submitTask({
      robotId: selectedRobotId,
      type,
      itemId,
      quantity,
      fromLocationId,
      toLocationId,
    });
  };

  const createQuickTask = async (quickItemId: WmsItemId, shelf: string) => {
    await submitTask({
      robotId: selectedRobotId,
      type: 'PUTAWAY',
      itemId: quickItemId,
      quantity: 1,
      fromLocationId: 'INBOUND-01',
      toLocationId: shelf,
    });
  };

  const updateItem = (nextItemId: WmsItemId) => {
    setItemId(nextItemId);
    if (type === 'PUTAWAY') {
      const defaultShelf = itemOptions.find(item => item.itemId === nextItemId)?.defaultShelf ?? 'SHELF-A1';
      setFromLocationId('INBOUND-01');
      setToLocationId(defaultShelf);
      setActualLocationId(defaultShelf);
    }
  };

  const updateType = (nextType: WmsTaskType) => {
    setType(nextType);
    if (nextType === 'PUTAWAY') {
      const defaultShelf = itemOptions.find(item => item.itemId === itemId)?.defaultShelf ?? 'SHELF-A1';
      setFromLocationId('INBOUND-01');
      setToLocationId(defaultShelf);
      setActualLocationId(defaultShelf);
    }
    if (nextType === 'PICKING') {
      setToLocationId('OUTBOUND-01');
    }
  };

  const manualPickup = async () => {
    if (!selectedTask) return;
    const updated = await wms.manualPickup(selectedTask.taskId, selectedRobotId);
    if (updated) {
      setNotice(`Đã xác nhận lấy hàng cho ${updated.taskId}.`);
    }
  };

  const manualDrop = async () => {
    if (!selectedTask) return;
    const updated = await wms.manualDrop(selectedTask.taskId, selectedRobotId, actualLocationId || selectedTask.toLocationId);
    if (updated) {
      setNotice(`Đã xác nhận thả hàng cho ${updated.taskId}. Kết quả: ${wmsTaskResultLabel[updated.result ?? 'PENDING_VERIFY']}.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhiệm vụ vận chuyển"
        description="Tạo nhiệm vụ nhập kho, xuất kho hoặc chuyển kệ cho robot. Ảnh pickup/drop là bằng chứng xác nhận, chưa dùng AI nhận diện vật phẩm."
        action={
          <button
            onClick={() => void wms.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        }
      />

      {wms.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{wms.error}</div>}
      {notice && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <SectionCard title="Tạo nhanh" description="Ba nút này đủ cho demo nhập kho 3 vật phẩm vào đúng 3 kệ.">
            <div className="grid grid-cols-1 gap-3">
              {itemOptions.map(option => (
                <button
                  key={option.itemId}
                  onClick={() => void createQuickTask(option.itemId, option.defaultShelf)}
                  disabled={wms.actionLoading}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-bold text-slate-950">Đưa {option.label} vào {option.defaultShelf}</span>
                    <span className="text-xs text-slate-500">Robot {selectedRobotId} nhận lệnh WMS_TASK</span>
                  </span>
                  <ClipboardPlus className="h-5 w-5 text-blue-600" />
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Form tạo nhiệm vụ" description="Dùng khi cần thử xuất kho hoặc chuyển kệ trong cùng mô hình demo.">
            <div className="space-y-4">
              <Field label="Robot">
                <input value={selectedRobotId} readOnly className="field-input" />
              </Field>
              <Field label="Loại nhiệm vụ">
                <select value={type} onChange={event => updateType(event.target.value as WmsTaskType)} className="field-input">
                  {(['PUTAWAY', 'PICKING', 'TRANSFER'] as WmsTaskType[]).map(value => <option key={value} value={value}>{wmsTaskTypeLabel[value]}</option>)}
                </select>
              </Field>
              <Field label="Vật phẩm">
                <select value={itemId} onChange={event => updateItem(event.target.value as WmsItemId)} className="field-input">
                  {itemOptions.map(option => <option key={option.itemId} value={option.itemId}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Số lượng">
                <input type="number" min={1} max={3} value={quantity} onChange={event => setQuantity(Number(event.target.value) || 1)} className="field-input" />
              </Field>
              <Field label="Từ vị trí">
                <select value={fromLocationId} onChange={event => setFromLocationId(event.target.value)} className="field-input">
                  {allLocations.map(location => <option key={location.locationId} value={location.locationId}>{location.name} ({location.locationId})</option>)}
                </select>
              </Field>
              <Field label="Đến vị trí">
                <select value={toLocationId} onChange={event => setToLocationId(event.target.value)} className="field-input">
                  {allLocations.map(location => <option key={location.locationId} value={location.locationId}>{location.name} ({location.locationId})</option>)}
                </select>
              </Field>
              <button
                onClick={() => void createFromForm()}
                disabled={wms.actionLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Tạo nhiệm vụ
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Danh sách nhiệm vụ" description="Mỗi nhiệm vụ WMS được tách theo robotId và có trạng thái ảnh xác nhận riêng.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Mã nhiệm vụ</th>
                    <th className="px-3 py-3">Robot</th>
                    <th className="px-3 py-3">Loại</th>
                    <th className="px-3 py-3">Vật phẩm</th>
                    <th className="px-3 py-3">Từ</th>
                    <th className="px-3 py-3">Đến</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Kết quả</th>
                    <th className="px-3 py-3">Ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {wms.tasks.map(task => (
                    <tr
                      key={task.taskId}
                      onClick={() => {
                        setSelectedTaskId(task.taskId);
                        setActualLocationId(task.toLocationId);
                      }}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${selectedTask?.taskId === task.taskId ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-3 font-mono text-xs font-bold text-slate-950">{task.taskId}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{task.robotId}</td>
                      <td className="px-3 py-3">{wmsTaskTypeLabel[task.type]}</td>
                      <td className="px-3 py-3 font-semibold text-slate-950">{task.itemId}</td>
                      <td className="px-3 py-3">{task.fromLocationId}</td>
                      <td className="px-3 py-3">{task.toLocationId}</td>
                      <td className="px-3 py-3"><StatusBadge tone={wmsTaskStatusTone[task.status]}>{wmsTaskStatusLabel[task.status]}</StatusBadge></td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={wmsTaskResultTone[task.result ?? 'PENDING_VERIFY']}>{wmsTaskResultLabel[task.result ?? 'PENDING_VERIFY']}</StatusBadge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {task.pickupProofImageUrl ? 'Lấy ' : ''}
                        {task.dropProofImageUrl ? 'Thả' : ''}
                        {!task.pickupProofImageUrl && !task.dropProofImageUrl ? 'Chưa có' : ''}
                      </td>
                    </tr>
                  ))}
                  {wms.tasks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">Chưa có nhiệm vụ WMS.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <WmsTaskDetail
            task={selectedTask}
            locations={shelfLocations.length > 0 ? shelfLocations : allLocations}
            actualLocationId={actualLocationId}
            onActualLocationChange={setActualLocationId}
            onManualPickup={manualPickup}
            onManualDrop={manualDrop}
            resolveUploadUrl={wms.resolveUploadUrl}
            actionLoading={wms.actionLoading}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
