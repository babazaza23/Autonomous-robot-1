import { RobotTelemetry } from '../types/robot';

function randomVariation(base: number, range: number, min?: number, max?: number): number {
  let val = base + (Math.random() - 0.5) * 2 * range;
  if (min !== undefined) val = Math.max(min, val);
  if (max !== undefined) val = Math.min(max, val);
  return Math.round(val * 100) / 100;
}

export function generateTelemetry(prev: RobotTelemetry, isMoving: boolean): RobotTelemetry {
  const batteryDrain = isMoving ? 0.05 : 0.01;
  return {
    timestamp: Date.now(),
    battery: Math.max(0, Math.min(100, prev.battery - batteryDrain + Math.random() * 0.02)),
    speed: isMoving ? randomVariation(0.3, 0.05, 0.1, 0.5) : 0,
    irSensors: {
      left: randomVariation(isMoving ? 800 : 200, 30, 0, 1023),
      center: randomVariation(isMoving ? 900 : 210, 20, 0, 1023),
      right: randomVariation(isMoving ? 780 : 190, 30, 0, 1023),
    },
    ultrasonicDistance: randomVariation(isMoving ? 40 : 100, 8, 3, 200),
    motorCurrentLeft: isMoving ? randomVariation(350, 40, 100, 900) : randomVariation(10, 5, 0, 30),
    motorCurrentRight: isMoving ? randomVariation(340, 40, 100, 900) : randomVariation(10, 5, 0, 30),
    servoAngles: {
      base: randomVariation(prev.servoAngles.base, 2, 0, 180),
      shoulder: randomVariation(prev.servoAngles.shoulder, 2, 0, 180),
      elbow: randomVariation(prev.servoAngles.elbow, 2, 0, 180),
      gripper: randomVariation(prev.servoAngles.gripper, 1, 0, 90),
    },
    mqttLatency: randomVariation(25, 10, 5, 200),
    uartStatus: Math.random() > 0.02 ? 'connected' : 'error',
    wifiRSSI: randomVariation(-45, 8, -90, -20),
  };
}

export function simulateCommandAck(latency: number = 200): Promise<{ ack: boolean; latency: number }> {
  const actualLatency = latency + Math.random() * 100;
  const success = Math.random() > 0.05;
  return new Promise(resolve =>
    setTimeout(() => resolve({ ack: success, latency: actualLatency }), actualLatency)
  );
}
