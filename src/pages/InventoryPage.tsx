import { AlertTriangle, Boxes, ClipboardList, MapPin, Package, RefreshCw, Warehouse } from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import { useWms } from '../hooks/useWms';
import type {
  InventoryStatus,
  LocationStatus,
  WarehouseAlert,
  WmsInventoryItem,
  WmsLocation,
} from '../types/wms';
import { inventoryStatusLabel, itemOptions, locationStatusLabel, warehouseAlertLevelLabel, warehouseAlertTypeLabel } from '../utils/statusLabels';

interface InventoryPageProps {
  serverHost?: string;
  selectedRobotId?: string;
}

const inventoryTone: Record<InventoryStatus, 'green' | 'amber' | 'red'> = {
  IN_STOCK: 'green',
  MOVING: 'amber',
  OUT_OF_STOCK: 'red',
};

const locationTone: Record<LocationStatus, 'green' | 'amber' | 'slate'> = {
  EMPTY: 'slate',
  OCCUPIED: 'green',
  RESERVED: 'amber',
};

export default function InventoryPage({ serverHost, selectedRobotId = 'robot-01' }: InventoryPageProps) {
  const wms = useWms(serverHost, selectedRobotId);
  const latestProofs = wms.locations.filter(location => location.lastProofImageUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kho hàng"
        description="Theo dõi 3 vật phẩm demo, vị trí kệ, số lượng tồn và ảnh xác nhận từ robot."
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

      {wms.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {wms.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng loại hàng" value={wms.summary?.totalItemTypes ?? 3} sub="ITEM-A, ITEM-B, ITEM-C" icon={Package} tone="blue" />
        <MetricCard label="Tổng số lượng" value={wms.summary?.totalQuantity ?? 0} sub="Tồn kho hiện tại" icon={Boxes} tone="green" />
        <MetricCard
          label="Kệ đang sử dụng"
          value={`${wms.summary?.usedLocations ?? 0}/${wms.summary?.totalLocations ?? 5}`}
          sub="Bao gồm bàn nhận và bàn xuất"
          icon={Warehouse}
          tone="slate"
        />
        <MetricCard label="Nhiệm vụ đang chạy" value={wms.summary?.runningTasks ?? 0} sub={`${wms.summary?.alerts ?? 0} cảnh báo kho`} icon={ClipboardList} tone="amber" />
      </div>

      <SectionCard title="Ba vật phẩm demo" description="WMS hiện giới hạn đúng 3 mã hàng để phục vụ mô hình robot tự hành trong kho mini.">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {itemOptions.map(option => {
            const item = wms.inventory.find(entry => entry.itemId === option.itemId);
            return <ItemCard key={option.itemId} item={item} fallbackName={option.label} />;
          })}
        </div>
      </SectionCard>

      <SectionCard title="Bản đồ kệ đơn giản" description="Robot nhận nhiệm vụ từ bàn nhận hàng, đưa vật phẩm đến đúng kệ, rồi gửi ảnh xác nhận sau khi thả.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {['INBOUND-01', 'SHELF-A1', 'SHELF-B1', 'SHELF-C1', 'OUTBOUND-01'].map(locationId => {
            const location = wms.locations.find(entry => entry.locationId === locationId);
            return <LocationTile key={locationId} location={location} imageUrl={wms.resolveUploadUrl(location?.lastProofImageUrl)} />;
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Ảnh xác nhận gần nhất" description="Chỉ lưu ảnh theo sự kiện pickup/drop, không lưu mọi frame realtime.">
          {latestProofs.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Chưa có ảnh xác nhận từ nhiệm vụ WMS.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {latestProofs.map(location => (
                <div key={location.locationId} className="rounded-xl border border-slate-200 bg-white p-3">
                  <img
                    src={wms.resolveUploadUrl(location.lastProofImageUrl) ?? ''}
                    alt={`Ảnh xác nhận tại ${location.name}`}
                    className="aspect-video w-full rounded-xl border border-slate-200 object-cover"
                  />
                  <p className="mt-3 text-sm font-bold text-slate-950">{location.name}</p>
                  <p className="text-xs text-slate-500">{location.itemId ?? 'Chưa có hàng'} · {formatTime(location.lastUpdatedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cảnh báo kho" description="Các cảnh báo đơn giản về kệ đầy, hết hàng, thiếu ảnh xác nhận hoặc sai vị trí.">
          {wms.alerts.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Chưa có cảnh báo kho.
            </p>
          ) : (
            <div className="space-y-3">
              {wms.alerts.slice(0, 5).map(alert => <AlertRow key={alert.alertId} alert={alert} />)}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ItemCard({ item, fallbackName }: { item?: WmsInventoryItem; fallbackName: string }) {
  const status = item?.status ?? 'OUT_OF_STOCK';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item?.itemId ?? 'Chưa có mã'}</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{item?.name ?? fallbackName}</h3>
        </div>
        <StatusBadge tone={inventoryTone[status]}>{inventoryStatusLabel[status]}</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Số lượng" value={String(item?.quantity ?? 0)} />
        <MiniStat label="Vị trí" value={item?.locationId ?? 'Chưa có'} />
      </div>
      <p className="mt-3 text-xs text-slate-500">Cập nhật: {formatTime(item?.lastUpdatedAt)}</p>
    </div>
  );
}

function LocationTile({ location, imageUrl }: { location?: WmsLocation; imageUrl: string | null }) {
  const status = location?.status ?? 'EMPTY';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-blue-600">{location?.locationId ?? 'Chưa có'}</p>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{location?.name ?? 'Chưa có vị trí'}</h3>
          <p className="text-xs text-slate-500">{location?.zone ?? 'Chưa phân khu'}</p>
        </div>
        <MapPin className="h-5 w-5 text-blue-600" />
      </div>
      <div className="mt-4 space-y-2">
        <StatusBadge tone={locationTone[status]}>{locationStatusLabel[status]}</StatusBadge>
        <MiniStat label="Hàng" value={location?.itemId ?? 'Không có'} />
        <MiniStat label="Sức chứa" value={`${location?.quantity ?? 0}/${location?.capacity ?? 0}`} />
      </div>
      {imageUrl && (
        <img src={imageUrl} alt={`Ảnh xác nhận ${location?.name}`} className="mt-3 aspect-video w-full rounded-xl border border-slate-200 object-cover" />
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: WarehouseAlert }) {
  const tone = alert.level === 'CRITICAL' ? 'red' : alert.level === 'WARNING' ? 'amber' : 'blue';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={tone}>{warehouseAlertLevelLabel[alert.level]}</StatusBadge>
            <span className="text-xs font-semibold text-slate-500">{warehouseAlertTypeLabel[alert.type]}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">{alert.message}</p>
          <p className="mt-1 text-xs text-slate-500">{formatTime(alert.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Chưa có dữ liệu';
  return new Date(timestamp).toLocaleString('vi-VN');
}

