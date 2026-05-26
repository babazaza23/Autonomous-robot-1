import { SensorData } from '../types/sensor';

const now = Date.now();

export const mockSensors: SensorData[] = [
  {
    robotId: 'AGV-01', timestamp: now,
    irLeft: 820, irCenter: 950, irRight: 780,
    ultrasonicDistance: 45, batteryVoltage: 3.9,
    motorCurrentLeft: 350, motorCurrentRight: 340,
    servoBase: 90, servoShoulder: 45, servoElbow: 120, servoGripper: 30,
    temperature: 38,
  },
  {
    robotId: 'AGV-02', timestamp: now,
    irLeft: 200, irCenter: 210, irRight: 190,
    ultrasonicDistance: 120, batteryVoltage: 4.1,
    motorCurrentLeft: 0, motorCurrentRight: 0,
    servoBase: 90, servoShoulder: 90, servoElbow: 90, servoGripper: 0,
    temperature: 32,
  },
  {
    robotId: 'AGV-03', timestamp: now,
    irLeft: 850, irCenter: 920, irRight: 810,
    ultrasonicDistance: 8, batteryVoltage: 3.4,
    motorCurrentLeft: 50, motorCurrentRight: 45,
    servoBase: 135, servoShoulder: 60, servoElbow: 100, servoGripper: 75,
    temperature: 41,
  },
];

export function generateSensorHistory(robotId: string, count: number = 20): SensorData[] {
  const history: SensorData[] = [];
  const base = mockSensors.find(s => s.robotId === robotId) || mockSensors[0];
  for (let i = count - 1; i >= 0; i--) {
    history.push({
      ...base,
      timestamp: now - i * 2000,
      irLeft: base.irLeft + Math.random() * 40 - 20,
      irCenter: base.irCenter + Math.random() * 30 - 15,
      irRight: base.irRight + Math.random() * 40 - 20,
      ultrasonicDistance: Math.max(3, base.ultrasonicDistance + Math.random() * 10 - 5),
      batteryVoltage: Math.max(3.0, base.batteryVoltage - i * 0.005),
      motorCurrentLeft: Math.max(0, base.motorCurrentLeft + Math.random() * 50 - 25),
      motorCurrentRight: Math.max(0, base.motorCurrentRight + Math.random() * 50 - 25),
      temperature: base.temperature + Math.random() * 2 - 1,
    });
  }
  return history;
}
