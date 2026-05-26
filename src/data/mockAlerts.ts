import { Alert } from '../types/alert';

const now = Date.now();

export const mockAlerts: Alert[] = [
  {
    id: 'ALT-001', type: 'obstacle_detected', severity: 'warning',
    robotId: 'AGV-03', message: 'Obstacle detected at 8cm',
    details: 'Ultrasonic sensor reading below threshold (10cm). Robot stopped for safety.',
    timestamp: now - 5000, acknowledged: false, acknowledgedAt: null,
    autoResolved: false, resolvedAt: null,
  },
  {
    id: 'ALT-002', type: 'low_battery', severity: 'warning',
    robotId: 'AGV-03', message: 'Battery level low (45%)',
    details: 'Battery voltage at 3.4V. Recommend charging soon.',
    timestamp: now - 30000, acknowledged: false, acknowledgedAt: null,
    autoResolved: false, resolvedAt: null,
  },
  {
    id: 'ALT-003', type: 'line_faded', severity: 'info',
    robotId: 'AGV-01', message: 'Line signal weak on right sensor',
    details: 'IR right sensor reading 780, approaching threshold 500.',
    timestamp: now - 120000, acknowledged: true, acknowledgedAt: now - 100000,
    autoResolved: true, resolvedAt: now - 90000,
  },
  {
    id: 'ALT-004', type: 'task_failed', severity: 'critical',
    robotId: 'AGV-01', message: 'Task TASK-007 failed',
    details: 'Emergency transfer failed. Robot could not reach destination N19.',
    timestamp: now - 820000, acknowledged: true, acknowledgedAt: now - 800000,
    autoResolved: false, resolvedAt: null,
  },
  {
    id: 'ALT-005', type: 'mqtt_disconnected', severity: 'critical',
    robotId: 'AGV-01', message: 'MQTT connection lost briefly',
    details: 'MQTT connection was lost for 3 seconds. Auto-reconnected.',
    timestamp: now - 600000, acknowledged: true, acknowledgedAt: now - 590000,
    autoResolved: true, resolvedAt: now - 597000,
  },
  {
    id: 'ALT-006', type: 'motor_stall', severity: 'warning',
    robotId: 'AGV-03', message: 'Motor current spike detected',
    details: 'Left motor current reached 780mA, near stall threshold 800mA.',
    timestamp: now - 200000, acknowledged: false, acknowledgedAt: null,
    autoResolved: true, resolvedAt: now - 195000,
  },
];
