import { useMemo, useState } from 'react';
import { colorBlocks } from '../data/colorBlocks';
import { warehouseMap } from '../data/mockMap';
import type { BlockColor } from '../types/inventory';
import type { RobotHardwareTelemetry, RobotTaskSnapshot } from '../types/robot';
import { dijkstra } from '../utils/dijkstra';

export function useRobotTask(telemetry: RobotHardwareTelemetry | null, sendTask?: (task: RobotTaskSnapshot) => Promise<void>) {
  const [localTasks, setLocalTasks] = useState<RobotTaskSnapshot[]>([]);
  const currentTask = telemetry?.currentTask ?? localTasks[0] ?? null;

  const createTaskForColor = async (robotId: string, color: BlockColor) => {
    const block = colorBlocks.find(item => item.color === color);
    if (!block) return null;

    const result = dijkstra(
      warehouseMap.edges.filter(edge => edge.available !== false && !edge.blocked),
      telemetry?.motion.currentNode || 'A0',
      block.dropNode,
    );
    const pickupPath = dijkstra(warehouseMap.edges, telemetry?.motion.currentNode || 'A0', block.pickupNode).path;
    const dropPath = dijkstra(warehouseMap.edges, block.pickupNode, block.dropNode).path;
    const path = pickupPath.length > 0 && dropPath.length > 0
      ? [...pickupPath, ...dropPath.slice(1)]
      : result.path;

    const task: RobotTaskSnapshot = {
      taskId: `TASK-${Date.now()}`,
      robotId,
      itemId: block.id,
      color,
      pickupNode: block.pickupNode,
      dropNode: block.dropNode,
      path,
      currentStep: 'WAITING_TASK',
      progress: 0,
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
    };

    setLocalTasks(prev => [task, ...prev]);
    await sendTask?.(task);
    return task;
  };

  const taskTimeline = useMemo(() => [
    'WAITING_TASK',
    'MOVE_TO_PICKUP',
    'ARRIVED_PICKUP',
    'IDENTIFY_ITEM',
    'GRIP_ITEM',
    'ITEM_GRIPPED',
    'MOVE_TO_DROP',
    'ARRIVED_DROP',
    'RELEASE_ITEM',
    'ITEM_RELEASED',
    'TASK_COMPLETED',
  ], []);

  return { currentTask, localTasks, createTaskForColor, taskTimeline };
}
