export type BlockColor = 'RED' | 'BLUE' | 'YELLOW';
export type CargoColor = 'red' | 'blue' | 'yellow' | 'green' | 'white' | 'black';
export type CargoShape = 'cube' | 'triangle' | 'circle' | 'box' | 'cylinder' | 'sphere';
export type CargoCategory = 'color_block' | 'electronics' | 'chemicals' | 'food' | 'fragile' | 'general';

export interface ColorBlockItem {
  id: 'RED_BLOCK' | 'BLUE_BLOCK' | 'YELLOW_BLOCK';
  color: BlockColor;
  shape: 'CUBE';
  pickupNode: 'A1';
  dropNode: 'C1' | 'C2' | 'C3';
  dropZone: string;
  status: 'READY' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'UNKNOWN_COLOR';
}

export interface CargoClassification {
  color: CargoColor;
  shape: CargoShape;
  category: CargoCategory;
  confidence: number;
  blockColor?: BlockColor | 'UNKNOWN_COLOR';
  dropNode?: string | null;
  dropZone?: string | null;
  status?: 'OK' | 'UNKNOWN_COLOR';
}

export interface InventoryItem {
  id: string;
  name: string;
  color: CargoColor;
  shape: CargoShape;
  category: CargoCategory;
  zone: string;
  slot: string;
  weight: number;
  status: 'stored' | 'pending_pickup' | 'in_transit' | 'delivered';
  classification: CargoClassification;
  addedAt: number;
  lastMoved: number | null;
}

export const colorToBlock = (color: string): BlockColor | 'UNKNOWN_COLOR' => {
  const normalized = color.toUpperCase();
  if (normalized === 'RED' || normalized === 'BLUE' || normalized === 'YELLOW') return normalized;
  return 'UNKNOWN_COLOR';
};
