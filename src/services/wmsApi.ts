import type {
  CreateWmsTaskPayload,
  InventoryHistory,
  WarehouseAlert,
  WmsInventoryItem,
  WmsLocation,
  WmsSummary,
  WmsTask,
} from '../types/wms';
import { requestJson } from './apiClient';

export interface WmsSnapshot {
  summary: WmsSummary;
  inventory: WmsInventoryItem[];
  locations: WmsLocation[];
  tasks: WmsTask[];
  history: InventoryHistory[];
  alerts: WarehouseAlert[];
}

export async function fetchWmsSnapshot(apiBaseUrl: string, robotId?: string): Promise<WmsSnapshot> {
  const taskQuery = robotId ? `?robotId=${encodeURIComponent(robotId)}` : '';
  const [summary, inventoryPayload, locationsPayload, tasksPayload, historyPayload, alertsPayload] = await Promise.all([
    requestJson<WmsSummary>(apiBaseUrl, '/api/wms/summary'),
    requestJson<{ items: WmsInventoryItem[] }>(apiBaseUrl, '/api/wms/inventory'),
    requestJson<{ locations: WmsLocation[] }>(apiBaseUrl, '/api/wms/locations'),
    requestJson<{ tasks: WmsTask[] }>(apiBaseUrl, `/api/wms/tasks${taskQuery}`),
    requestJson<{ history: InventoryHistory[] }>(apiBaseUrl, '/api/wms/history'),
    requestJson<{ alerts: WarehouseAlert[] }>(apiBaseUrl, '/api/wms/alerts'),
  ]);

  return {
    summary,
    inventory: inventoryPayload.items,
    locations: locationsPayload.locations,
    tasks: tasksPayload.tasks,
    history: historyPayload.history,
    alerts: alertsPayload.alerts,
  };
}

export async function createWmsTask(apiBaseUrl: string, payload: CreateWmsTaskPayload) {
  return requestJson<{ task: WmsTask }>(apiBaseUrl, '/api/wms/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function manualWmsPickup(apiBaseUrl: string, taskId: string, robotId: string) {
  return requestJson<{ task: WmsTask }>(apiBaseUrl, `/api/wms/tasks/${encodeURIComponent(taskId)}/manual-pickup`, {
    method: 'POST',
    body: JSON.stringify({ robotId }),
  });
}

export async function manualWmsDrop(apiBaseUrl: string, taskId: string, robotId: string, actualLocationId?: string) {
  return requestJson<{ task: WmsTask }>(apiBaseUrl, `/api/wms/tasks/${encodeURIComponent(taskId)}/manual-drop`, {
    method: 'POST',
    body: JSON.stringify({ robotId, actualLocationId }),
  });
}
