export type WmsItemId = 'ITEM-A' | 'ITEM-B' | 'ITEM-C';

export type InventoryStatus = 'IN_STOCK' | 'MOVING' | 'OUT_OF_STOCK';
export type LocationStatus = 'EMPTY' | 'OCCUPIED' | 'RESERVED';
export type WmsTaskType = 'PUTAWAY' | 'PICKING' | 'TRANSFER';
export type WmsTaskStatus =
  | 'CREATED'
  | 'GOING_TO_PICK'
  | 'PICK_PHOTO_UPLOADED'
  | 'PICKED'
  | 'MOVING_TO_DROP'
  | 'DROPPED'
  | 'DROP_PHOTO_UPLOADED'
  | 'COMPLETED'
  | 'FAILED';
export type WmsTaskResult = 'CORRECT_LOCATION' | 'WRONG_LOCATION' | 'PENDING_VERIFY' | 'ROBOT_FAILED';
export type InventoryHistoryAction = 'PUTAWAY' | 'PICKING' | 'TRANSFER' | 'ADJUST';
export type WarehouseAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type WarehouseAlertType =
  | 'SHELF_FULL'
  | 'OUT_OF_STOCK'
  | 'MISSING_PROOF_IMAGE'
  | 'WRONG_LOCATION'
  | 'ROBOT_OFFLINE';

export interface WmsInventoryItem {
  itemId: WmsItemId;
  name: string;
  quantity: number;
  locationId: string | null;
  status: InventoryStatus;
  lastUpdatedAt: number;
}

export interface WmsLocation {
  locationId: string;
  name: string;
  zone: string;
  itemId: string | null;
  quantity: number;
  capacity: number;
  status: LocationStatus;
  lastProofImageUrl?: string;
  lastUpdatedAt: number;
}

export interface WmsTask {
  taskId: string;
  robotId: string;
  type: WmsTaskType;
  itemId: WmsItemId;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  expectedLocationId: string;
  actualLocationId?: string;
  status: WmsTaskStatus;
  pickupProofImageUrl?: string;
  dropProofImageUrl?: string;
  result?: WmsTaskResult;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryHistory {
  historyId: string;
  timestamp: number;
  taskId?: string;
  robotId?: string;
  itemId: string;
  action: InventoryHistoryAction;
  quantityDelta: number;
  fromLocationId?: string;
  toLocationId?: string;
  note: string;
  proofImageUrl?: string;
}

export interface WarehouseAlert {
  alertId: string;
  level: WarehouseAlertLevel;
  type: WarehouseAlertType;
  message: string;
  itemId?: string;
  locationId?: string;
  taskId?: string;
  createdAt: number;
}

export interface WmsSummary {
  totalItemTypes: number;
  totalQuantity: number;
  usedLocations: number;
  totalLocations: number;
  runningTasks: number;
  alerts: number;
}

export interface CreateWmsTaskPayload {
  robotId: string;
  type: WmsTaskType;
  itemId: WmsItemId;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
}
