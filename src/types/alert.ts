export type AlertType =
  | 'ROBOT_OFFLINE'
  | 'ESP32_DISCONNECTED'
  | 'UNO_DISCONNECTED'
  | 'UART_TIMEOUT'
  | 'CAMERA_DISCONNECTED'
  | 'OBSTACLE_NEAR'
  | 'OBSTACLE_DANGER'
  | 'LOST_LINE'
  | 'MPU_DISCONNECTED'
  | 'ENCODER_ERROR'
  | 'ODOMETRY_DRIFT'
  | 'BATTERY_UNKNOWN'
  | 'LOW_BATTERY'
  | 'UNKNOWN_COLOR'
  | 'EMERGENCY_STOP'
  | 'TRAFFIC_CONFLICT'
  | 'EDGE_RESERVED_CONFLICT'
  | 'ROBOT_WAITING_TRAFFIC'
  | 'obstacle_detected'
  | 'person_detected'
  | 'line_lost'
  | 'line_faded'
  | 'low_battery'
  | 'critical_battery'
  | 'uart_disconnected'
  | 'mqtt_disconnected'
  | 'motor_stall'
  | 'temperature_high'
  | 'task_failed'
  | 'path_blocked';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  robotId?: string;
  message: string;
  details?: string;
  timestamp: number;
  acknowledged?: boolean;
  acknowledgedAt?: number | null;
  autoResolved?: boolean;
  resolvedAt?: number | null;
}
