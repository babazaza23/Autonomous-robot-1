import { DEFAULT_ROBOT_ID, Robot } from '../types/robot';

const now = Date.now();

export const mockRobots: Robot[] = [
  {
    id: DEFAULT_ROBOT_ID,
    name: 'robot-01',
    status: 'idle',
    battery: 0,
    position: { nodeId: 'A0', x: 90, y: 280 },
    currentTaskId: null,
    speed: 0,
    telemetry: {
      timestamp: now,
      battery: 0,
      speed: 0,
      irSensors: { left: 0, center: 1, right: 0 },
      ultrasonicDistance: 80,
      motorCurrentLeft: 0,
      motorCurrentRight: 0,
      servoAngles: { base: 90, shoulder: 90, elbow: 90, gripper: 60 },
      mqttLatency: 0,
      uartStatus: 'disconnected',
      wifiRSSI: -60,
    },
    commandHistory: [],
    pathQueue: [],
    connectedSince: null,
    firmwareVersion: 'ESP32-S3-N16R8 + UNO R3',
  },
];
