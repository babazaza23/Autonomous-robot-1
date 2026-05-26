import type { BlockColor } from './inventory';
import type { RobotState } from './robot';

export type TaskStatus =
  | 'pending'
  | 'sent_to_robot'
  | 'robot_ack'
  | 'moving_to_pickup'
  | 'identifying_cargo'
  | 'gripping_cargo'
  | 'moving_to_drop'
  | 'releasing_cargo'
  | 'completed'
  | 'failed'
  | 'emergency_stopped'
  | 'in_progress'
  | 'cancelled';

export interface ColorBlockTask {
  taskId: string;
  robotId: string;
  itemId: 'RED_BLOCK' | 'BLUE_BLOCK' | 'YELLOW_BLOCK';
  color: BlockColor;
  pickupNode: string;
  dropNode: string;
  path: string[];
  currentStep: RobotState;
  progress: number;
  status: 'PENDING' | 'SENT_TO_ROBOT' | 'ROBOT_ACK' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EMERGENCY_STOPPED';
  startedAt: number | null;
  completedAt: number | null;
}

export interface Task {
  id: string;
  type: 'transfer' | 'pick' | 'drop' | 'charge' | 'patrol';
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  robotId: string | null;
  sourceNode: string;
  destinationNode: string;
  cargoId: string | null;
  description: string;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  estimatedDuration: number;
  progress: number;
}
