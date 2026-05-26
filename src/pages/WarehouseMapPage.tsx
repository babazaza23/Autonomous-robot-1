import { Lock, Map, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmergencyStopButton from '../components/common/EmergencyStopButton';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatusBadge from '../components/common/StatusBadge';
import { fixedColorPaths, warehouseMap } from '../data/mockMap';
import { useTrafficManager } from '../hooks/useTrafficManager';
import type { RobotTelemetryState } from '../types/robot';
import { dijkstra } from '../utils/dijkstra';

interface WarehouseMapPageProps {
  robotTelemetry: RobotTelemetryState;
  selectedRobotId: string;
}

const nodeColors = {
  dock: '#2563EB',
  pickup: '#16A34A',
  junction: '#64748B',
  drop: '#F59E0B',
};

function nodeColor(type: string) {
  return nodeColors[type as keyof typeof nodeColors] ?? '#64748B';
}

const robotColors = ['#2563EB', '#DC2626', '#16A34A', '#7C3AED', '#F59E0B'];

export default function WarehouseMapPage({ robotTelemetry, selectedRobotId }: WarehouseMapPageProps) {
  const traffic = useTrafficManager(robotTelemetry);
  const selectedTelemetry = robotTelemetry.telemetryByRobotId[selectedRobotId] ?? robotTelemetry.latestTelemetry;
  const [startNode, setStartNode] = useState(selectedTelemetry?.motion.currentNode ?? 'A1');
  const [endNode, setEndNode] = useState('C1');
  const [lockedEdges, setLockedEdges] = useState<Set<string>>(new Set());

  const availableEdges = useMemo(() => warehouseMap.edges.filter(edge =>
    edge.available !== false && !edge.blocked && !lockedEdges.has(edgeKey(edge.from, edge.to)),
  ), [lockedEdges]);
  const pathResult = useMemo(() => dijkstra(availableEdges, startNode, endNode), [availableEdges, startNode, endNode]);
  const plannedPathEdges = useMemo(() => pathToEdgeSet(pathResult.path), [pathResult.path]);
  const reservedEdges = new Set(traffic.reservedEdges.map(edge => edgeKeyFromString(edge.edgeId)));
  const occupiedEdges = new Set(traffic.edgeOccupancy.map(edge => edgeKeyFromString(edge.edgeId)));
  const selectedEdge = selectedTelemetry?.motion.currentEdge ? edgeKeyFromString(selectedTelemetry.motion.currentEdge) : null;

  const toggleEdge = (from: string, to: string) => {
    const key = edgeKey(from, to);
    setLockedEdges(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bản đồ topo"
        description="Bản đồ node-edge đơn giản cho mô hình kho: bàn nhận, điểm trung gian và 3 khu đặt hàng. Dijkstra hỗ trợ khóa cạnh và tìm đường thay thế."
        action={<EmergencyStopButton compact />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard title="Sơ đồ node-edge" description="Robot hiển thị tại currentNode hoặc currentEdge theo telemetry. Cạnh màu cam/đỏ là cạnh có robot, đã đặt trước hoặc bị khóa." icon={<Map className="h-4 w-4 text-[#2563EB]" />}>
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <svg viewBox={`0 0 ${warehouseMap.width} ${warehouseMap.height}`} className="h-auto w-full">
              <defs>
                <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={warehouseMap.width} height={warehouseMap.height} fill="url(#mapGrid)" />
              <text x="40" y="44" fill="#94A3B8" fontSize="13" fontWeight="700">NHẬN: A1</text>
              <text x={warehouseMap.width - 230} y="44" fill="#94A3B8" fontSize="13" fontWeight="700">THẢ: C1/C2/C3</text>

              {warehouseMap.edges.map(edge => {
                const from = nodeById(edge.from);
                const to = nodeById(edge.to);
                if (!from || !to) return null;
                const key = edgeKey(edge.from, edge.to);
                const locked = lockedEdges.has(key) || edge.available === false || edge.blocked;
                const occupied = occupiedEdges.has(key);
                const reserved = reservedEdges.has(key);
                const inPath = plannedPathEdges.has(key);
                const selected = selectedEdge === key;
                const stroke = locked ? '#DC2626' : selected || occupied ? '#2563EB' : reserved ? '#F59E0B' : inPath ? '#16A34A' : '#CBD5E1';
                return (
                  <g key={key}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={stroke}
                      strokeWidth={selected || occupied || inPath ? 5 : 3}
                      strokeLinecap="round"
                      strokeDasharray={locked ? '8 8' : undefined}
                    />
                    <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="700">
                      {edge.weight}m
                    </text>
                  </g>
                );
              })}

              {warehouseMap.nodes.map(node => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r="26" fill={nodeColor(node.type)} stroke="#FFFFFF" strokeWidth="5" />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="800">{node.id}</text>
                  <text x={node.x} y={node.y + 46} textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="700">{node.label}</text>
                </g>
              ))}

              {Object.values(robotTelemetry.telemetryByRobotId).map((telemetry, index) => {
                const point = robotPoint(telemetry.motion.currentNode, telemetry.motion.currentEdge);
                if (!point) return null;
                const color = robotColors[index % robotColors.length];
                return (
                  <g key={telemetry.robotId} transform={`translate(${point.x}, ${point.y})`}>
                    <circle r="35" fill="none" stroke={color} strokeWidth="3" opacity="0.25" />
                    <rect x="-18" y="-15" width="36" height="30" rx="8" fill="#0F172A" />
                    <circle cx="-8" cy="18" r="4" fill={color} />
                    <circle cx="8" cy="18" r="4" fill={color} />
                    <text y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="800">{index + 1}</text>
                    <text y="-26" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">{telemetry.robotId}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Lập đường Dijkstra" description="Khóa cạnh để mô phỏng đường bị chặn; Dijkstra chỉ dùng cạnh khả dụng.">
            <div className="space-y-3">
              <SelectNode label="Điểm bắt đầu" value={startNode} onChange={setStartNode} />
              <SelectNode label="Điểm đích" value={endNode} onChange={setEndNode} />
              <PanelRow label="Đường đi" value={pathResult.path.join(' -> ') || 'Không có đường đi'} />
              <PanelRow label="Khoảng cách" value={pathResult.totalDistance >= 0 ? `${pathResult.totalDistance} m` : 'Chưa có'} />
            </div>
          </SectionCard>

          <SectionCard title="Luồng màu cố định" description="Đường vận chuyển chuẩn cho 3 khối màu.">
            <div className="space-y-2">
              {Object.entries(fixedColorPaths).map(([color, path]) => (
                <PanelRow key={color} label={color} value={path.join(' -> ')} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Khóa cạnh đường đi" description="Mô phỏng cạnh bị khóa do vật cản, robot lỗi hoặc giao thông.">
            <div className="space-y-2">
              {warehouseMap.edges.map(edge => {
                const key = edgeKey(edge.from, edge.to);
                const locked = lockedEdges.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleEdge(edge.from, edge.to)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-left text-sm font-bold text-[#0F172A] hover:bg-slate-50"
                  >
                    <span>{edge.from} - {edge.to}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge tone={locked ? 'red' : 'green'}>{locked ? 'Đã khóa' : 'Đang mở'}</StatusBadge>
                      {locked ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-emerald-600" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Tư thế odometry" description="Odometry ước lượng từ encoder + MPU; có thể trôi nếu chưa có mốc reset tuyệt đối.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <PanelRow label="Tọa độ X ước lượng" value={formatNumber(selectedTelemetry?.localization.estimatedX)} />
            <PanelRow label="Tọa độ Y ước lượng" value={formatNumber(selectedTelemetry?.localization.estimatedY)} />
            <PanelRow label="Góc theta ước lượng" value={`${formatNumber(selectedTelemetry?.localization.estimatedTheta)} độ`} />
            <PanelRow label="Độ tin cậy" value={selectedTelemetry?.localization.confidence ?? 'Chưa có'} />
          </div>
        </SectionCard>

        <SectionCard title="Quản lý giao thông" description="Hiển thị node/cạnh đang chiếm, reservation và xung đột. Logic server sẽ dùng các trạng thái này để tránh va chạm khi mở rộng nhiều robot.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TrafficList title="Robot chiếm node" rows={traffic.nodeOccupancy.map(item => `${item.robotId}: ${item.nodeId}`)} />
            <TrafficList title="Robot trên edge" rows={traffic.edgeOccupancy.map(item => `${item.robotId}: ${item.edgeId}`)} />
            <TrafficList title="Cạnh đã đặt trước" rows={traffic.reservedEdges.map(item => `${item.robotId}: ${item.edgeId}`)} />
            <TrafficList title="Robot đang chờ" rows={traffic.waitingRobots.map(item => `${item.robotId}: ${item.reason}`)} />
            <TrafficList title="Xung đột" rows={traffic.conflicts.map(item => `${item.type} ${item.id}: ${item.robots.join(', ')}`)} danger />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SelectNode({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-[#64748B]">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]">
        {warehouseMap.nodes.map(node => <option key={node.id} value={node.id}>{node.id} - {node.label}</option>)}
      </select>
    </label>
  );
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-bold uppercase text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function TrafficList({ title, rows, danger = false }: { title: string; rows: string[]; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${danger && rows.length > 0 ? 'border-red-200 bg-red-50' : 'border-[#E2E8F0] bg-white'}`}>
      <p className="mb-2 text-xs font-bold uppercase text-[#64748B]">{title}</p>
      <div className="space-y-1">
        {rows.length ? rows.map(row => <p key={row} className="font-mono text-xs font-bold text-[#0F172A]">{row}</p>) : <p className="text-xs text-[#64748B]">Không có</p>}
      </div>
    </div>
  );
}

function nodeById(id: string) {
  return warehouseMap.nodes.find(node => node.id === id);
}

function edgeKey(from: string, to: string) {
  return [from, to].sort().join('-');
}

function edgeKeyFromString(edgeId: string) {
  const [from, to] = edgeId.split('-');
  return from && to ? edgeKey(from, to) : edgeId;
}

function pathToEdgeSet(path: string[]) {
  const set = new Set<string>();
  path.forEach((nodeId, index) => {
    const next = path[index + 1];
    if (next) set.add(edgeKey(nodeId, next));
  });
  return set;
}

function robotPoint(currentNode: string | null, currentEdge: string | null) {
  if (currentEdge) {
    const [fromId, toId] = currentEdge.split('-');
    const from = fromId ? nodeById(fromId) : null;
    const to = toId ? nodeById(toId) : null;
    if (from && to) return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  }
  return currentNode ? nodeById(currentNode) : null;
}

function formatNumber(value: number | null | undefined) {
  return value == null ? 'Chưa có' : value.toFixed(1);
}
