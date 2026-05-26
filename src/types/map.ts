export type WarehouseNodeType = 'dock' | 'pickup' | 'junction' | 'drop' | 'wait' | 'maintenance' | 'storage' | 'intersection' | 'dropoff' | 'entrance' | 'charging';

export interface WarehouseNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: WarehouseNodeType;
  zone?: string;
  slot?: string;
  wide?: boolean;
}

export interface WarehouseEdge {
  from: string;
  to: string;
  weight: number;
  bidirectional: boolean;
  available?: boolean;
  narrow?: boolean;
  reservedBy?: string | null;
  blocked?: boolean;
}

export interface WarehouseMap {
  width: number;
  height: number;
  nodes: WarehouseNode[];
  edges: WarehouseEdge[];
}

export interface PathResult {
  path: string[];
  totalDistance: number;
  estimatedTime: number;
}
