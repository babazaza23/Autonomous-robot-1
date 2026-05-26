import { blockColorMeta } from '../data/colorBlocks';
import type { BlockColor, CargoClassification, CargoColor, CargoShape } from '../types/inventory';
import { colorToBlock } from '../types/inventory';

const lowerToBlock: Partial<Record<CargoColor, BlockColor>> = {
  red: 'RED',
  blue: 'BLUE',
  yellow: 'YELLOW',
};

export function classifyByColorName(color: string): CargoClassification {
  const blockColor = colorToBlock(color);
  if (blockColor === 'UNKNOWN_COLOR') {
    return {
      color: 'red',
      shape: 'cube',
      category: 'color_block',
      confidence: 0,
      blockColor,
      dropNode: null,
      dropZone: null,
      status: 'UNKNOWN_COLOR',
    };
  }

  const meta = blockColorMeta[blockColor];
  return {
    color: blockColor.toLowerCase() as CargoColor,
    shape: 'cube',
    category: 'color_block',
    confidence: 0.96,
    blockColor,
    dropNode: meta.dropNode,
    dropZone: meta.dropZone,
    status: 'OK',
  };
}

export function classifyCargo(color: CargoColor, shape: CargoShape = 'cube'): CargoClassification {
  const blockColor = lowerToBlock[color] ?? 'UNKNOWN_COLOR';
  if (blockColor === 'UNKNOWN_COLOR' || shape !== 'cube') {
    return {
      color,
      shape,
      category: 'color_block',
      confidence: 0.4,
      blockColor: 'UNKNOWN_COLOR',
      dropNode: null,
      dropZone: null,
      status: 'UNKNOWN_COLOR',
    };
  }

  const meta = blockColorMeta[blockColor];
  return {
    color,
    shape: 'cube',
    category: 'color_block',
    confidence: 0.98,
    blockColor,
    dropNode: meta.dropNode,
    dropZone: meta.dropZone,
    status: 'OK',
  };
}
