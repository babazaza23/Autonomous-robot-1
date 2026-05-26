import { WarehouseMap } from '../types/map';

export const warehouseMap: WarehouseMap = {
  width: 820,
  height: 560,
  nodes: [
    { id: 'A0', label: 'Dock', x: 90, y: 280, type: 'dock', wide: true },
    { id: 'A1', label: 'Pickup Zone', x: 230, y: 160, type: 'pickup', wide: true },
    { id: 'B1', label: 'Junction 1', x: 390, y: 280, type: 'junction' },
    { id: 'B2', label: 'Junction 2', x: 540, y: 280, type: 'junction' },
    { id: 'C1', label: 'Drop Red', x: 700, y: 120, type: 'drop', zone: 'RED' },
    { id: 'C2', label: 'Drop Blue', x: 700, y: 280, type: 'drop', zone: 'BLUE' },
    { id: 'C3', label: 'Drop Yellow', x: 700, y: 440, type: 'drop', zone: 'YELLOW' },
  ],
  edges: [
    { from: 'A0', to: 'A1', weight: 2, bidirectional: true, available: true, narrow: true },
    { from: 'A0', to: 'B1', weight: 3, bidirectional: true, available: true, narrow: true },
    { from: 'A1', to: 'B1', weight: 2, bidirectional: true, available: true, narrow: true },
    { from: 'B1', to: 'B2', weight: 2, bidirectional: true, available: true, narrow: true },
    { from: 'B1', to: 'C1', weight: 3, bidirectional: true, available: true, narrow: true },
    { from: 'B2', to: 'C2', weight: 2, bidirectional: true, available: true, narrow: true },
    { from: 'B2', to: 'C3', weight: 3, bidirectional: true, available: true, narrow: true },
  ],
};

export const fixedColorPaths = {
  RED: ['A1', 'B1', 'C1'],
  BLUE: ['A1', 'B1', 'B2', 'C2'],
  YELLOW: ['A1', 'B2', 'C3'],
} as const;
