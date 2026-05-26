import type { BlockColor, ColorBlockItem } from '../types/inventory';

export const colorBlocks: ColorBlockItem[] = [
  {
    id: 'RED_BLOCK',
    color: 'RED',
    shape: 'CUBE',
    pickupNode: 'A1',
    dropNode: 'C1',
    dropZone: 'Khu đặt khối đỏ',
    status: 'READY',
  },
  {
    id: 'BLUE_BLOCK',
    color: 'BLUE',
    shape: 'CUBE',
    pickupNode: 'A1',
    dropNode: 'C2',
    dropZone: 'Khu đặt khối xanh',
    status: 'READY',
  },
  {
    id: 'YELLOW_BLOCK',
    color: 'YELLOW',
    shape: 'CUBE',
    pickupNode: 'A1',
    dropNode: 'C3',
    dropZone: 'Khu đặt khối và ng',
    status: 'READY',
  },
];

export const blockColorMeta: Record<BlockColor, { label: string; hex: string; dropNode: string; dropZone: string }> = {
  RED: { label: 'Đỏ', hex: '#DC2626', dropNode: 'C1', dropZone: 'Khu đặt khối đỏ' },
  BLUE: { label: 'Xanh dương', hex: '#2563EB', dropNode: 'C2', dropZone: 'Khu đặt khối xanh' },
  YELLOW: { label: 'Vàng', hex: '#F59E0B', dropNode: 'C3', dropZone: 'Khu đặt khối và ng' },
};

export function getBlockByColor(color: BlockColor) {
  return colorBlocks.find(block => block.color === color);
}
