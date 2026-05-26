export const DEFAULT_ROBOT_ID = 'robot-01';

export type RobotState =
  | 'POWER_ON'
  | 'CONNECTING_SERVER'
  | 'IDLE'
  | 'WAITING_TASK'
  | 'PLAN_ROUTE'
  | 'MOVE_TO_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'IDENTIFY_ITEM'
  | 'GRIP_ITEM'
  | 'ITEM_GRIPPED'
  | 'MOVE_TO_DROP'
  | 'ARRIVED_DROP'
  | 'RELEASE_ITEM'
  | 'ITEM_RELEASED'
  | 'TASK_COMPLETED'
  | 'WAITING_TRAFFIC'
  | 'EDGE_RESERVED'
  | 'MOVING_ON_EDGE'
  | 'ARRIVED_NODE'
  | 'REPLANNING_ROUTE'
  | 'TRAFFIC_BLOCKED'
  | 'OBSTACLE_AVOID'
  | 'LOST_LINE'
  | 'ODOMETRY_DRIFT'
  | 'EMERGENCY_STOP'
  | 'ERROR';

export type RobotMode = 'AUTONOMOUS' | 'MANUAL' | 'MAINTENANCE' | 'SIMULATOR';
export type RobotRegistryStatus = 'REGISTERED' | 'OFFLINE' | 'ONLINE';
export type HealthStatus = 'OK' | 'WARNING' | 'ERROR' | 'UNKNOWN';

export interface RegisteredRobot {
  robotId: string;
  name: string;
  type: string;
  status: RobotRegistryStatus;
  hardwareNote?: string;
  registeredAt: number;
}

export interface RobotTaskSnapshot {
  taskId: string;
  robotId: string;
  itemId: 'RED_BLOCK' | 'BLUE_BLOCK' | 'YELLOW_BLOCK';
  color: 'RED' | 'BLUE' | 'YELLOW';
  pickupNode: string;
  dropNode: string;
  path: string[];
  currentStep: RobotState;
  progress: number;
  status: 'PENDING' | 'SENT_TO_ROBOT' | 'ROBOT_ACK' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EMERGENCY_STOPPED';
  startedAt: number | null;
  completedAt: number | null;
}

export interface RobotHardwareTelemetry {
  robotId: string;
  timestamp: number;
  receivedAt?: number;
  state: RobotState;
  mode: RobotMode;
  battery?: number;
  speed?: number;
  lineDetected?: boolean;
  ultrasonicFrontCm?: number;
  ultrasonicLeftCm?: number;
  ultrasonicRightCm?: number;
  encoderLeft?: number;
  encoderRight?: number;
  zoneId?: string;
  pose?: {
    x?: number | null;
    y?: number | null;
    heading?: number | null;
    zoneId?: string | null;
    currentNode?: string | null;
    nextNode?: string | null;
    reservedZone?: string | null;
    reservedPath?: string | null;
    lastSeenAt?: number;
  };
  fleetSafety?: Record<string, unknown>;
  suggestedRobotState?: string;
  connection: {
    esp32: boolean;
    uno: boolean | null;
    uart: boolean | null;
    wifi: boolean;
    server: boolean;
  };
  power: {
    source: '3S_18650_BATTERY_HOLDER' | string;
    packVoltage: number | null;
    batteryPercent: number | null;
    note?: string;
  };
  line: {
    irLeft: number;
    irCenter: number;
    irRight: number;
    lineStatus: 'NORMAL_LINE' | 'WEAK_LINE' | 'LOST_LINE' | string;
  };
  obstacle: {
    ultrasonicDistance: number | null;
    status: 'CLEAR' | 'NEAR' | 'DANGER' | 'UNKNOWN' | string;
  };
  encoder: {
    leftTicks: number | null;
    rightTicks: number | null;
    leftDistanceCm: number | null;
    rightDistanceCm: number | null;
    distanceTravelledCm: number | null;
    linearVelocityCms: number | null;
    angularVelocityDegs: number | null;
    status: HealthStatus;
  };
  mpu: {
    connected: boolean | null;
    yawDeg: number | null;
    gyroZ: number | null;
    accelX?: number | null;
    accelY?: number | null;
    headingStatus: HealthStatus;
  };
  localization: {
    method: 'ENCODER_MPU_ODOMETRY' | 'UNKNOWN' | string;
    estimatedX: number | null;
    estimatedY: number | null;
    estimatedTheta: number | null;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' | string;
    driftWarning: boolean;
    note: string;
  };
  motion: {
    currentNode: string | null;
    nextNode: string | null;
    currentEdge: string | null;
    leftMotorCommand: number | null;
    rightMotorCommand: number | null;
    l298n: HealthStatus;
  };
  arm: {
    base: number | null;
    shoulder: number | null;
    elbow: number | null;
    gripper: number | null;
    holdingItem: boolean;
  };
  camera: {
    connected: boolean | null;
    mode: 'EVENT_SNAPSHOT' | 'LOW_FPS_MONITORING' | 'OFF' | string;
    lastFrameAt: number | null;
    lastFrameReason: 'PICKUP_SCAN' | 'OBSTACLE_DETECTED' | 'BEFORE_GRIP' | 'AFTER_GRIP' | 'BEFORE_RELEASE' | 'AFTER_RELEASE' | null | string;
    lastDetectedColor: 'RED' | 'BLUE' | 'YELLOW' | string | null;
    confidence: number | null;
  };
  currentTask: RobotTaskSnapshot | null;
}

export interface RobotTelemetryState {
  connected: boolean;
  latestTelemetry: RobotHardwareTelemetry | null;
  telemetryByRobotId: Record<string, RobotHardwareTelemetry>;
  registeredRobots: RegisteredRobot[];
  robotOnline: boolean;
  lastReceivedAt: number | null;
  now: number;
  source: 'server' | 'simulator' | 'none';
  addRobot: (robot: Omit<RegisteredRobot, 'registeredAt' | 'status'> & { status?: RobotRegistryStatus }) => Promise<void>;
  sendTask: (task: RobotTaskSnapshot) => Promise<void>;
}

export interface BatteryDisplay {
  label: string;
  percentLabel: string;
  voltageLabel: string;
  estimated: boolean;
  tone: 'green' | 'amber' | 'red' | 'slate';
  note: string;
}

export function estimateBatteryPercent(packVoltage: number | null | undefined) {
  if (packVoltage == null) return null;
  return Math.max(0, Math.min(100, ((packVoltage - 9.0) / (12.6 - 9.0)) * 100));
}

export function getBatteryDisplay(power: RobotHardwareTelemetry['power']): BatteryDisplay {
  const explicitPercent = power.batteryPercent;
  const estimatedPercent = explicitPercent == null ? estimateBatteryPercent(power.packVoltage) : explicitPercent;

  if (estimatedPercent == null) {
    return {
      label: 'Pin: chưa rõ',
      percentLabel: 'Chưa đo',
      voltageLabel: power.packVoltage == null ? 'Chưa đo' : `${power.packVoltage.toFixed(2)}V`,
      estimated: false,
      tone: 'slate',
      note: power.note || 'Chưa có mạch đo điện áp pin qua ADC.',
    };
  }

  return {
    label: explicitPercent == null ? 'Pin ước lượng' : 'Pin đo từ telemetry',
    percentLabel: `${estimatedPercent.toFixed(0)}%`,
    voltageLabel: power.packVoltage == null ? 'Chưa đo' : `${power.packVoltage.toFixed(2)}V`,
    estimated: explicitPercent == null,
    tone: estimatedPercent < 20 ? 'red' : estimatedPercent < 45 ? 'amber' : 'green',
    note: explicitPercent == null ? 'Ước lượng từ điện áp pack 3S Li-ion, không phải giá trị tuyệt đối.' : 'Giá trị do robot gửi lên.',
  };
}

export const DEFAULT_ROBOT_TELEMETRY: RobotHardwareTelemetry = {
  robotId: DEFAULT_ROBOT_ID,
  timestamp: 0,
  state: 'WAITING_TASK',
  mode: 'SIMULATOR',
  connection: { esp32: false, uno: null, uart: null, wifi: false, server: false },
  power: {
    source: '3S_18650_BATTERY_HOLDER',
    packVoltage: null,
    batteryPercent: null,
    note: 'Chưa đo điện áp pin',
  },
  line: { irLeft: 0, irCenter: 1, irRight: 0, lineStatus: 'NORMAL_LINE' },
  obstacle: { ultrasonicDistance: 80, status: 'CLEAR' },
  encoder: {
    leftTicks: 0,
    rightTicks: 0,
    leftDistanceCm: 0,
    rightDistanceCm: 0,
    distanceTravelledCm: 0,
    linearVelocityCms: 0,
    angularVelocityDegs: 0,
    status: 'OK',
  },
  mpu: { connected: true, yawDeg: 0, gyroZ: 0, accelX: 0, accelY: 0, headingStatus: 'OK' },
  localization: {
    method: 'ENCODER_MPU_ODOMETRY',
    estimatedX: 0,
    estimatedY: 0,
    estimatedTheta: 0,
    confidence: 'MEDIUM',
    driftWarning: false,
    note: 'Ước lượng bằng encoder và MPU, chưa phải định vị tuyệt đối',
  },
  motion: {
    currentNode: 'A0',
    nextNode: null,
    currentEdge: null,
    leftMotorCommand: 0,
    rightMotorCommand: 0,
    l298n: 'OK',
  },
  arm: { base: 90, shoulder: 90, elbow: 90, gripper: 60, holdingItem: false },
  camera: {
    connected: true,
    mode: 'EVENT_SNAPSHOT',
    lastFrameAt: null,
    lastFrameReason: null,
    lastDetectedColor: null,
    confidence: null,
  },
  currentTask: null,
};

export type CommandType = 'MOVE' | 'PICK' | 'DROP' | 'STOP' | 'HOME' | 'CHARGE';
export type AckStatus = 'pending' | 'ack' | 'nack';

export interface RobotCommand {
  id: string;
  type: CommandType;
  payload: Record<string, unknown>;
  timestamp: number;
  ackStatus: AckStatus;
  ackTimestamp?: number;
}

export interface RobotTelemetry {
  timestamp: number;
  battery: number;
  speed: number;
  irSensors: { left: number; center: number; right: number };
  ultrasonicDistance: number;
  motorCurrentLeft: number;
  motorCurrentRight: number;
  servoAngles: { base: number; shoulder: number; elbow: number; gripper: number };
  mqttLatency: number;
  uartStatus: 'connected' | 'disconnected' | 'error';
  wifiRSSI: number;
}

export interface Robot {
  id: string;
  name: string;
  status: 'idle' | 'moving' | 'picking' | 'dropping' | 'charging' | 'error';
  battery: number;
  position: { nodeId: string; x: number; y: number };
  currentTaskId: string | null;
  speed: number;
  telemetry: RobotTelemetry;
  commandHistory: RobotCommand[];
  pathQueue: string[];
  connectedSince: number | null;
  firmwareVersion: string;
}
