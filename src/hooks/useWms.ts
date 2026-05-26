import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildApiBaseUrl } from '../services/apiClient';
import { createWmsTask, fetchWmsSnapshot, manualWmsDrop, manualWmsPickup } from '../services/wmsApi';
import type {
  CreateWmsTaskPayload,
  InventoryHistory,
  WarehouseAlert,
  WmsInventoryItem,
  WmsLocation,
  WmsSummary,
  WmsTask,
} from '../types/wms';
import { DEFAULT_AI_SERVER_HOST } from './useVisionServer';

interface WmsState {
  summary: WmsSummary | null;
  inventory: WmsInventoryItem[];
  locations: WmsLocation[];
  tasks: WmsTask[];
  history: InventoryHistory[];
  alerts: WarehouseAlert[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  apiBaseUrl: string;
  reload: (silent?: boolean) => Promise<void>;
  createTask: (payload: CreateWmsTaskPayload) => Promise<WmsTask | null>;
  manualPickup: (taskId: string, robotId: string) => Promise<WmsTask | null>;
  manualDrop: (taskId: string, robotId: string, actualLocationId?: string) => Promise<WmsTask | null>;
  resolveUploadUrl: (url?: string | null) => string | null;
}

export function useWms(serverHost: string = DEFAULT_AI_SERVER_HOST, robotId?: string): WmsState {
  const [summary, setSummary] = useState<WmsSummary | null>(null);
  const [inventory, setInventory] = useState<WmsInventoryItem[]>([]);
  const [locations, setLocations] = useState<WmsLocation[]>([]);
  const [tasks, setTasks] = useState<WmsTask[]>([]);
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [alerts, setAlerts] = useState<WarehouseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => buildApiBaseUrl(serverHost), [serverHost]);

  const resolveUploadUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    return `${apiBaseUrl}${url}`;
  }, [apiBaseUrl]);

  const reload = useCallback(async (silent = false) => {
    if (!apiBaseUrl) return;
    if (!silent) setLoading(true);
    try {
      const snapshot = await fetchWmsSnapshot(apiBaseUrl, robotId);
      setSummary(snapshot.summary);
      setInventory(snapshot.inventory);
      setLocations(snapshot.locations);
      setTasks(snapshot.tasks);
      setHistory(snapshot.history);
      setAlerts(snapshot.alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được máy chủ WMS. Kiểm tra IP LAN, cổng 8000 hoặc firewall.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiBaseUrl, robotId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  useEffect(() => {
    if (!apiBaseUrl) return undefined;
    const timer = window.setInterval(() => void reload(true), 3000);
    return () => window.clearInterval(timer);
  }, [apiBaseUrl, reload]);

  const createTask = useCallback(async (payload: CreateWmsTaskPayload) => {
    setActionLoading(true);
    try {
      const response = await createWmsTask(apiBaseUrl, payload);
      await reload(true);
      return response.task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được nhiệm vụ WMS.');
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [apiBaseUrl, reload]);

  const manualPickup = useCallback(async (taskId: string, selectedRobotId: string) => {
    setActionLoading(true);
    try {
      const response = await manualWmsPickup(apiBaseUrl, taskId, selectedRobotId);
      await reload(true);
      return response.task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xác nhận được bước lấy hàng.');
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [apiBaseUrl, reload]);

  const manualDrop = useCallback(async (taskId: string, selectedRobotId: string, actualLocationId?: string) => {
    setActionLoading(true);
    try {
      const response = await manualWmsDrop(apiBaseUrl, taskId, selectedRobotId, actualLocationId);
      await reload(true);
      return response.task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xác nhận được bước thả hàng.');
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [apiBaseUrl, reload]);

  return {
    summary,
    inventory,
    locations,
    tasks,
    history,
    alerts,
    loading,
    actionLoading,
    error,
    apiBaseUrl,
    reload,
    createTask,
    manualPickup,
    manualDrop,
    resolveUploadUrl,
  };
}
