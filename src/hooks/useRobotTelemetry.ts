import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ROBOT_ID,
  DEFAULT_ROBOT_TELEMETRY,
  RegisteredRobot,
  RobotHardwareTelemetry,
  RobotTaskSnapshot,
  RobotTelemetryState,
} from '../types/robot';
import { DEFAULT_AI_SERVER_HOST } from './useVisionServer';

interface RobotSocketMessage {
  event?: string;
  type?: string;
  robotId?: string;
  data?: RobotHardwareTelemetry | Record<string, RobotHardwareTelemetry>;
  telemetry?: RobotHardwareTelemetry | Record<string, RobotHardwareTelemetry>;
  robots?: RegisteredRobot[];
  traffic?: Record<string, unknown>;
}

function normalizeServerHost(serverHost: string) {
  return serverHost.trim().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/+$/, '');
}

const defaultRobot: RegisteredRobot = {
  robotId: DEFAULT_ROBOT_ID,
  name: 'robot-01',
  type: 'ESP32-S3 line-following AGV',
  status: 'REGISTERED',
  hardwareNote: 'ESP32-S3-N16R8, UNO R3 UART, L298N, encoder, MPU, camera, MG90S arm',
  registeredAt: Date.now(),
};

function createSimulatorTelemetry(tick: number): RobotHardwareTelemetry {
  const path = ['A0', 'A1', 'B1', 'C1'];
  const segment = Math.floor(tick / 4) % path.length;
  const currentNode = path[segment];
  const nextNode = path[segment + 1] ?? null;
  const moving = nextNode !== null && tick % 4 !== 0;
  const distance = tick * 7;

  return {
    ...DEFAULT_ROBOT_TELEMETRY,
    timestamp: Date.now(),
    state: moving ? 'MOVING_ON_EDGE' : 'WAITING_TASK',
    mode: 'SIMULATOR',
    connection: { esp32: true, uno: true, uart: true, wifi: true, server: true },
    line: { irLeft: 0, irCenter: 1, irRight: 0, lineStatus: 'NORMAL_LINE' },
    obstacle: { ultrasonicDistance: 65 + Math.sin(tick / 3) * 12, status: 'CLEAR' },
    encoder: {
      leftTicks: tick * 120,
      rightTicks: tick * 118,
      leftDistanceCm: distance,
      rightDistanceCm: distance * 0.98,
      distanceTravelledCm: distance,
      linearVelocityCms: moving ? 18 : 0,
      angularVelocityDegs: moving ? 2.5 : 0,
      status: 'OK',
    },
    mpu: { connected: true, yawDeg: (tick * 8) % 360, gyroZ: moving ? 2.5 : 0, accelX: 0, accelY: 0, headingStatus: 'OK' },
    localization: {
      method: 'ENCODER_MPU_ODOMETRY',
      estimatedX: distance * 0.7,
      estimatedY: 12 * Math.sin(tick / 4),
      estimatedTheta: (tick * 8) % 360,
      confidence: 'MEDIUM',
      driftWarning: tick % 18 === 0,
      note: 'Estimated by encoder and MPU, not absolute localization',
    },
    motion: {
      currentNode,
      nextNode,
      currentEdge: nextNode ? `${currentNode}-${nextNode}` : null,
      leftMotorCommand: moving ? 120 : 0,
      rightMotorCommand: moving ? 118 : 0,
      l298n: 'OK',
    },
    arm: { base: 90, shoulder: 90, elbow: 90, gripper: 60, holdingItem: tick % 20 > 10 },
    camera: { connected: true, mode: 'EVENT_SNAPSHOT', lastFrameAt: null, lastFrameReason: null, lastDetectedColor: null, confidence: null },
  };
}

function protocolPair() {
  const httpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return {
    http: httpsPage ? 'https' : 'http',
    ws: httpsPage ? 'wss' : 'ws',
  };
}

export function useRobotTelemetry(serverHost: string = DEFAULT_AI_SERVER_HOST, selectedRobotId = DEFAULT_ROBOT_ID, demoMode = false): RobotTelemetryState {
  const [registeredRobots, setRegisteredRobots] = useState<RegisteredRobot[]>([defaultRobot]);
  const [telemetryByRobotId, setTelemetryByRobotId] = useState<Record<string, RobotHardwareTelemetry>>({});
  const [lastReceivedByRobotId, setLastReceivedByRobotId] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const normalizedHost = useMemo(() => normalizeServerHost(serverHost), [serverHost]);
  const protocols = useMemo(() => protocolPair(), []);
  const apiBaseUrl = useMemo(() => normalizedHost ? `${protocols.http}://${normalizedHost}` : '', [normalizedHost, protocols.http]);
  const wsBaseUrl = useMemo(() => normalizedHost ? `${protocols.ws}://${normalizedHost}` : '', [normalizedHost, protocols.ws]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!demoMode) return;
    const timer = window.setInterval(() => setTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    const timer = window.setTimeout(() => {
      const telemetry = createSimulatorTelemetry(tick);
      setTelemetryByRobotId(prev => ({ ...prev, [DEFAULT_ROBOT_ID]: telemetry }));
      setLastReceivedByRobotId(prev => ({ ...prev, [DEFAULT_ROBOT_ID]: telemetry.timestamp }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [demoMode, tick]);

  useEffect(() => {
    if (!wsBaseUrl) return;
    let disposed = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnect();
      try {
        const socket = new WebSocket(`${wsBaseUrl}/ws/robot`);
        websocketRef.current = socket;

        socket.onopen = () => {
          if (disposed) return;
          setConnected(true);
        };

        socket.onmessage = event => {
          if (disposed) return;
          try {
            const message = JSON.parse(event.data) as RobotSocketMessage;
            if (message.robots) {
              setRegisteredRobots(prev => mergeRobots(prev, message.robots ?? []));
            }
            const eventName = message.event ?? message.type;
            const telemetryPayload = message.telemetry ?? message.data;
            if ((eventName === 'ROBOT_TELEMETRY' || eventName === 'robot_telemetry') && message.robotId && telemetryPayload && !isTelemetryMap(telemetryPayload)) {
              const telemetry = normalizeTelemetry(telemetryPayload as RobotHardwareTelemetry);
              setTelemetryByRobotId(prev => ({ ...prev, [message.robotId as string]: telemetry }));
              setLastReceivedByRobotId(prev => ({ ...prev, [message.robotId as string]: telemetry.receivedAt ?? Date.now() }));
            }
            if ((eventName === 'ROBOT_SNAPSHOT' || eventName === 'robot_snapshot') && telemetryPayload && isTelemetryMap(telemetryPayload)) {
              const next: Record<string, RobotHardwareTelemetry> = {};
              const nextReceived: Record<string, number> = {};
              for (const [robotId, telemetry] of Object.entries(telemetryPayload)) {
                next[robotId] = normalizeTelemetry(telemetry);
                nextReceived[robotId] = telemetry.receivedAt ?? telemetry.timestamp ?? Date.now();
              }
              setTelemetryByRobotId(prev => ({ ...prev, ...next }));
              setLastReceivedByRobotId(prev => ({ ...prev, ...nextReceived }));
            }
          } catch {
            // Ignore malformed telemetry frames.
          }
        };

        socket.onclose = () => {
          if (disposed) return;
          setConnected(false);
          reconnectTimerRef.current = window.setTimeout(connect, 2500);
        };

        socket.onerror = () => {
          if (disposed) return;
          setConnected(false);
        };
      } catch {
        setConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      }
    };

    connect();
    return () => {
      disposed = true;
      clearReconnect();
      websocketRef.current?.close();
      websocketRef.current = null;
      setConnected(false);
    };
  }, [wsBaseUrl]);

  const addRobot = useCallback(async (robot: Omit<RegisteredRobot, 'registeredAt' | 'status'> & { status?: RegisteredRobot['status'] }) => {
    const payload: RegisteredRobot = {
      robotId: robot.robotId,
      name: robot.name,
      type: robot.type,
      status: 'REGISTERED',
      hardwareNote: robot.hardwareNote,
      registeredAt: Date.now(),
    };
    setRegisteredRobots(prev => mergeRobots(prev, [payload]));

    if (apiBaseUrl) {
      try {
        await fetch(`${apiBaseUrl}/api/robots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Local registration is still useful when the server is offline.
      }
    }
  }, [apiBaseUrl]);

  const sendTask = useCallback(async (task: RobotTaskSnapshot) => {
    if (!apiBaseUrl) return;
    try {
      await fetch(`${apiBaseUrl}/api/robot/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
    } catch {
      // Simulator/demo can continue without server command queue.
    }
  }, [apiBaseUrl]);

  const latestTelemetry = telemetryByRobotId[selectedRobotId] ?? (demoMode ? createSimulatorTelemetry(tick) : null);
  const lastReceivedAt = lastReceivedByRobotId[selectedRobotId] ?? (latestTelemetry?.timestamp || null);
  const robotOnline = Boolean(lastReceivedAt && now - lastReceivedAt <= 5000);
  const source = connected && telemetryByRobotId[selectedRobotId] ? 'server' : demoMode ? 'simulator' : 'none';

  return {
    connected,
    latestTelemetry,
    telemetryByRobotId,
    registeredRobots,
    robotOnline,
    lastReceivedAt,
    now,
    source,
    addRobot,
    sendTask,
  };
}

function mergeRobots(current: RegisteredRobot[], incoming: RegisteredRobot[]) {
  const map = new Map<string, RegisteredRobot>();
  current.forEach(robot => map.set(robot.robotId, robot));
  incoming.forEach(robot => map.set(robot.robotId, { ...map.get(robot.robotId), ...robot }));
  return Array.from(map.values());
}

function isTelemetryMap(value: unknown): value is Record<string, RobotHardwareTelemetry> {
  return Boolean(value && typeof value === 'object' && !('robotId' in value));
}

function normalizeTelemetry(input: RobotHardwareTelemetry): RobotHardwareTelemetry {
  return {
    ...DEFAULT_ROBOT_TELEMETRY,
    ...input,
    connection: { ...DEFAULT_ROBOT_TELEMETRY.connection, ...input.connection },
    power: { ...DEFAULT_ROBOT_TELEMETRY.power, ...input.power },
    line: { ...DEFAULT_ROBOT_TELEMETRY.line, ...input.line },
    obstacle: { ...DEFAULT_ROBOT_TELEMETRY.obstacle, ...input.obstacle },
    encoder: { ...DEFAULT_ROBOT_TELEMETRY.encoder, ...input.encoder },
    mpu: { ...DEFAULT_ROBOT_TELEMETRY.mpu, ...input.mpu },
    localization: { ...DEFAULT_ROBOT_TELEMETRY.localization, ...input.localization },
    motion: { ...DEFAULT_ROBOT_TELEMETRY.motion, ...input.motion },
    arm: { ...DEFAULT_ROBOT_TELEMETRY.arm, ...input.arm },
    camera: { ...DEFAULT_ROBOT_TELEMETRY.camera, ...input.camera },
  };
}
