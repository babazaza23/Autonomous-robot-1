import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import DataTable, { DataTableColumn } from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import { mockLogs, type LogEntry } from '../data/mockLogs';
import { useWms } from '../hooks/useWms';
import { historyActionLabel, warehouseAlertLevelLabel, warehouseAlertTypeLabel } from '../utils/statusLabels';

const levelTone: Record<string, 'blue' | 'amber' | 'red' | 'slate'> = {
  info: 'blue',
  warning: 'amber',
  error: 'red',
  debug: 'slate',
  critical: 'red',
};

interface LogPageProps {
  logs?: LogEntry[];
  serverHost?: string;
  selectedRobotId?: string;
}

export default function LogPage({ logs: providedLogs, serverHost, selectedRobotId }: LogPageProps) {
  const wms = useWms(serverHost, selectedRobotId);
  const [fallbackLogs] = useState<LogEntry[]>(mockLogs);
  const logs = providedLogs ?? fallbackLogs;
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [module, setModule] = useState('all');
  const [taskId, setTaskId] = useState('');

  const modules = useMemo(() => ['all', ...Array.from(new Set(logs.map(log => log.source)))], [logs]);
  const filtered = logs.filter(log => {
    const keyword = search.toLowerCase();
    const matchesSearch = !search || log.message.toLowerCase().includes(keyword) || log.source.toLowerCase().includes(keyword);
    const matchesLevel = level === 'all' || log.level === level;
    const matchesModule = module === 'all' || log.source === module;
    const matchesTask = !taskId || log.message.toLowerCase().includes(taskId.toLowerCase());
    return matchesSearch && matchesLevel && matchesModule && matchesTask;
  });
  const columns = useMemo<DataTableColumn<LogEntry>[]>(() => [
    {
      key: 'time',
      header: 'Thời gian',
      className: 'mono text-xs text-slate-500',
      render: log => new Date(log.timestamp).toLocaleString('vi-VN'),
    },
    {
      key: 'level',
      header: 'Mức độ',
      render: log => <StatusBadge tone={levelTone[log.level]}>{logLevelLabel(log.level)}</StatusBadge>,
    },
    {
      key: 'source',
      header: 'Module',
      className: 'mono text-xs font-bold text-slate-950',
      render: log => log.source,
    },
    {
      key: 'robot',
      header: 'Robot',
      className: 'mono text-xs text-slate-500',
      render: log => log.robotId ?? '-',
    },
    {
      key: 'message',
      header: 'Tin nhắn',
      className: 'text-slate-950',
      render: log => log.message,
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader title="Nhật ký" description="Theo dõi sự kiện robot, AI Vision, lịch sử tồn kho và cảnh báo kho." />

      <SectionCard title="Bộ lọc" description="Lọc theo module, mức độ, mã nhiệm vụ hoặc nội dung tin nhắn.">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_180px_220px_180px]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tìm kiếm nhật ký..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>
          <select value={level} onChange={event => setLevel(event.target.value)} className="field-input">
            {['all', 'info', 'warning', 'error', 'debug'].map(item => <option key={item} value={item}>{item === 'all' ? 'Tất cả mức độ' : logLevelLabel(item)}</option>)}
          </select>
          <select value={module} onChange={event => setModule(event.target.value)} className="field-input">
            {modules.map(item => <option key={item} value={item}>{item === 'all' ? 'Tất cả module' : item}</option>)}
          </select>
          <input value={taskId} onChange={event => setTaskId(event.target.value)} placeholder="Mã nhiệm vụ" className="field-input" />
        </div>
      </SectionCard>

      <SectionCard title="Nhật ký sự kiện hệ thống" description={`Đang hiển thị ${filtered.length} trên ${logs.length} bản ghi.`}>
        <DataTable rows={filtered} columns={columns} getRowKey={log => log.id} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Lịch sử tồn kho" description="Ghi nhận nhập kho, xuất kho và chuyển kệ sau khi nhiệm vụ WMS hoàn tất.">
          <div className="space-y-3">
            {wms.history.slice(0, 8).map(item => (
              <div key={item.historyId} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={item.quantityDelta >= 0 ? 'green' : 'amber'}>{historyActionLabel[item.action]}</StatusBadge>
                  <span className="font-mono text-xs font-bold text-slate-950">{item.itemId}</span>
                  <span className="text-xs font-semibold text-slate-500">{item.fromLocationId ?? '-'} → {item.toLocationId ?? '-'}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.note}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.timestamp).toLocaleString('vi-VN')}</p>
              </div>
            ))}
            {wms.history.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Chưa có lịch sử tồn kho.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Lịch sử cảnh báo kho" description="Các cảnh báo WMS như sai vị trí, thiếu ảnh xác nhận hoặc hết hàng.">
          <div className="space-y-3">
            {wms.alerts.slice(0, 8).map(alert => (
              <div key={alert.alertId} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={alert.level === 'CRITICAL' ? 'red' : alert.level === 'WARNING' ? 'amber' : 'blue'}>{warehouseAlertLevelLabel[alert.level]}</StatusBadge>
                  <span className="text-xs font-bold text-slate-950">{warehouseAlertTypeLabel[alert.type]}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{alert.message}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(alert.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            ))}
            {wms.alerts.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Chưa có cảnh báo kho.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}


function logLevelLabel(level: string) {
  const labels: Record<string, string> = { info: 'Thông tin', warning: 'Cảnh báo', error: 'Lỗi', debug: 'Gỡ lỗi', critical: 'Nghiêm trọng' };
  return labels[level] ?? level;
}
