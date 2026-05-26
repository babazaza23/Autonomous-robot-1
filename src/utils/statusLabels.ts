import type {
  InventoryHistoryAction,
  InventoryStatus,
  LocationStatus,
  WarehouseAlertLevel,
  WarehouseAlertType,
  WmsItemId,
  WmsTaskResult,
  WmsTaskStatus,
  WmsTaskType,
} from '../types/wms';

export const inventoryStatusLabel: Record<InventoryStatus, string> = {
  IN_STOCK: 'Có trong kho',
  MOVING: 'Đang vận chuyển',
  OUT_OF_STOCK: 'Hết hàng',
};

export const locationStatusLabel: Record<LocationStatus, string> = {
  EMPTY: 'Trống',
  OCCUPIED: 'Đang có hàng',
  RESERVED: 'Đã đặt trước',
};

export const wmsTaskTypeLabel: Record<WmsTaskType, string> = {
  PUTAWAY: 'Nhập kho',
  PICKING: 'Xuất kho',
  TRANSFER: 'Chuyển kệ',
};

export const wmsTaskStatusLabel: Record<WmsTaskStatus, string> = {
  CREATED: 'Đã tạo',
  GOING_TO_PICK: 'Robot đang đến vị trí lấy',
  PICK_PHOTO_UPLOADED: 'Đã có ảnh trước khi lấy',
  PICKED: 'Đã lấy hàng',
  MOVING_TO_DROP: 'Đang vận chuyển đến kệ',
  DROPPED: 'Đã thả hàng',
  DROP_PHOTO_UPLOADED: 'Đã có ảnh sau khi thả',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Lỗi',
};

export const wmsTaskResultLabel: Record<WmsTaskResult, string> = {
  CORRECT_LOCATION: 'Đúng vị trí',
  WRONG_LOCATION: 'Sai vị trí',
  PENDING_VERIFY: 'Chờ xác nhận',
  ROBOT_FAILED: 'Robot báo lỗi',
};

export const historyActionLabel: Record<InventoryHistoryAction, string> = {
  PUTAWAY: 'Nhập kho',
  PICKING: 'Xuất kho',
  TRANSFER: 'Chuyển kệ',
  ADJUST: 'Điều chỉnh',
};

export const warehouseAlertLevelLabel: Record<WarehouseAlertLevel, string> = {
  INFO: 'Thông tin',
  WARNING: 'Cảnh báo',
  CRITICAL: 'Nghiêm trọng',
};

export const warehouseAlertTypeLabel: Record<WarehouseAlertType, string> = {
  SHELF_FULL: 'Kệ đầy',
  OUT_OF_STOCK: 'Hết hàng',
  MISSING_PROOF_IMAGE: 'Thiếu ảnh xác nhận',
  WRONG_LOCATION: 'Sai vị trí',
  ROBOT_OFFLINE: 'Robot ngoại tuyến',
};

export const itemOptions: Array<{ itemId: WmsItemId; label: string; defaultShelf: string }> = [
  { itemId: 'ITEM-A', label: 'Vật phẩm A', defaultShelf: 'SHELF-A1' },
  { itemId: 'ITEM-B', label: 'Vật phẩm B', defaultShelf: 'SHELF-B1' },
  { itemId: 'ITEM-C', label: 'Vật phẩm C', defaultShelf: 'SHELF-C1' },
];


export const wmsTaskStatusTone: Record<WmsTaskStatus, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = {
  CREATED: 'blue',
  GOING_TO_PICK: 'blue',
  PICK_PHOTO_UPLOADED: 'amber',
  PICKED: 'amber',
  MOVING_TO_DROP: 'blue',
  DROPPED: 'amber',
  DROP_PHOTO_UPLOADED: 'amber',
  COMPLETED: 'green',
  FAILED: 'red',
};

export const wmsTaskResultTone: Record<WmsTaskResult, 'green' | 'red' | 'amber'> = {
  CORRECT_LOCATION: 'green',
  WRONG_LOCATION: 'red',
  PENDING_VERIFY: 'amber',
  ROBOT_FAILED: 'red',
};
