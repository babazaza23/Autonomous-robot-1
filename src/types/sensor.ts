export interface SensorData {
  robotId: string;
  timestamp: number;
  irLeft: number;      // 0-1023 analog value
  irCenter: number;    // 0-1023
  irRight: number;     // 0-1023
  ultrasonicDistance: number; // cm
  batteryVoltage: number;    // V
  motorCurrentLeft: number;  // mA
  motorCurrentRight: number; // mA
  servoBase: number;    // degrees 0-180
  servoShoulder: number;
  servoElbow: number;
  servoGripper: number; // degrees 0-90
  temperature: number;  // °C (ESP32 internal)
}

export interface SensorThresholds {
  irLineThreshold: number;       // below = line detected
  ultrasonicObstacle: number;    // cm, below = obstacle
  batteryLow: number;            // V, below = low battery
  batteryCritical: number;       // V, below = critical
  motorCurrentMax: number;       // mA, above = motor stall
  temperatureMax: number;        // °C, above = overheating
}

export const DEFAULT_THRESHOLDS: SensorThresholds = {
  irLineThreshold: 500,
  ultrasonicObstacle: 10,
  batteryLow: 3.4,
  batteryCritical: 3.0,
  motorCurrentMax: 800,
  temperatureMax: 70,
};
