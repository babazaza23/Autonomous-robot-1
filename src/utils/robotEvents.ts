import type { LogEntry } from '../data/mockLogs';
import type { Alert } from '../types/alert';
import { DEFAULT_ROBOT_ID, getBatteryDisplay, RobotHardwareTelemetry } from '../types/robot';

export function buildRobotAlerts(telemetry: RobotHardwareTelemetry | null, robotOnline: boolean): Alert[] {
  const now = Date.now();
  const robotId = telemetry?.robotId || DEFAULT_ROBOT_ID;
  const alerts: Alert[] = [];

  const push = (type: Alert['type'], severity: Alert['severity'], message: string, details?: string) => {
    alerts.push({
      id: `${type}-${robotId}`,
      type,
      severity,
      robotId,
      message,
      details,
      timestamp: now,
      acknowledged: false,
    });
  };

  if (!robotOnline) push('ROBOT_OFFLINE', 'critical', 'Robot mất kết nối', 'Không nhận heartbeat trong hơn 5 giây.');
  if (!telemetry) {
    push('BATTERY_UNKNOWN', 'info', 'Chưa có dữ liệu pin', 'Chưa có telemetry pin từ robot.');
    return alerts;
  }

  if (!telemetry.connection.esp32) push('ESP32_DISCONNECTED', 'critical', 'ESP32-S3 mất kết nối');
  if (telemetry.connection.uno === false) push('UNO_DISCONNECTED', 'warning', 'UNO R3 mất kết nối');
  if (telemetry.connection.uart === false) push('UART_TIMEOUT', 'critical', 'UART timeout', 'ESP32-S3 không giao tiếp được với UNO R3.');
  if (telemetry.camera.connected === false) push('CAMERA_DISCONNECTED', 'warning', 'Camera mất kết nối');
  if (telemetry.obstacle.ultrasonicDistance != null && telemetry.obstacle.ultrasonicDistance < 30) {
    push('OBSTACLE_DANGER', 'critical', `Phát hiện vật cản nguy hiểm: ${telemetry.obstacle.ultrasonicDistance.toFixed(0)}cm`);
  } else if (telemetry.obstacle.ultrasonicDistance != null && telemetry.obstacle.ultrasonicDistance < 50) {
    push('OBSTACLE_NEAR', 'warning', `Vật cản gần robot: ${telemetry.obstacle.ultrasonicDistance.toFixed(0)}cm`);
  }
  if (telemetry.line.lineStatus === 'LOST_LINE') push('LOST_LINE', 'critical', 'Robot mất line');
  if (telemetry.mpu.connected === false) push('MPU_DISCONNECTED', 'warning', 'MPU mất kết nối');
  if (telemetry.encoder.status === 'ERROR') push('ENCODER_ERROR', 'warning', 'Lỗi encoder');
  if (telemetry.localization.driftWarning) push('ODOMETRY_DRIFT', 'warning', 'Odometry có dấu hiệu trôi');
  if (telemetry.state === 'EMERGENCY_STOP') push('EMERGENCY_STOP', 'critical', 'Dừng khẩn cấp đang bật');
  if (telemetry.state === 'TRAFFIC_BLOCKED') push('TRAFFIC_CONFLICT', 'warning', 'Phát hiện xung đột giao thông');
  if (telemetry.state === 'WAITING_TRAFFIC') push('ROBOT_WAITING_TRAFFIC', 'info', 'Robot đang chờ vùng đường trống');

  const battery = getBatteryDisplay(telemetry.power);
  if (battery.percentLabel === 'Chưa đo') {
    push('BATTERY_UNKNOWN', 'info', 'Chưa có dữ liệu pin', 'Chưa có mạch đo điện áp pin, không tạo cảnh báo pin yếu.');
  } else if (battery.tone === 'red') {
    push('LOW_BATTERY', 'warning', `Pin yếu: ${battery.percentLabel}`, battery.note);
  }

  const color = telemetry.camera.lastDetectedColor;
  if (color && !['RED', 'BLUE', 'YELLOW'].includes(color)) {
    push('UNKNOWN_COLOR', 'warning', `Màu chưa xác định: ${color}`, 'Cần xác nhận thủ công.');
  }

  return alerts;
}

export function buildRobotLogs(telemetry: RobotHardwareTelemetry | null, robotOnline: boolean, source: string): LogEntry[] {
  const now = Date.now();
  const robotId = telemetry?.robotId ?? DEFAULT_ROBOT_ID;
  const logs: LogEntry[] = [
    { id: 'LOG-ROBOT-REGISTERED', timestamp: now - 4500, level: 'info', source: 'RobotRegistry', robotId, message: 'Robot đã đăng ký' },
    { id: 'LOG-SOURCE', timestamp: now - 4000, level: 'info', source: 'Telemetry', robotId, message: source === 'server' ? 'Robot đang trực tuyến' : source === 'simulator' ? 'Đang dùng dữ liệu mô phỏng' : 'Đang chờ heartbeat từ robot' },
  ];

  if (!telemetry) {
    logs.unshift({ id: 'LOG-WAITING', timestamp: now, level: 'warning', source: 'Telemetry', robotId, message: 'Robot mất kết nối' });
    return logs;
  }

  logs.unshift({ id: 'LOG-HEARTBEAT', timestamp: telemetry.timestamp || now, level: robotOnline ? 'info' : 'warning', source: 'Telemetry', robotId, message: robotOnline ? 'Đã nhận heartbeat' : 'Robot mất kết nối' });
  logs.unshift({ id: 'LOG-ODOMETRY', timestamp: now - 300, level: 'debug', source: 'Odometry', robotId, message: `Odometry cập nhật: x=${telemetry.localization.estimatedX ?? 'Chưa có'}, y=${telemetry.localization.estimatedY ?? 'Chưa có'}, theta=${telemetry.localization.estimatedTheta ?? 'Chưa có'}` });
  logs.unshift({ id: 'LOG-ENCODER', timestamp: now - 600, level: 'debug', source: 'Encoder', robotId, message: `Encoder cập nhật: trái=${telemetry.encoder.leftTicks ?? 'Chưa có'}, phải=${telemetry.encoder.rightTicks ?? 'Chưa có'}` });
  logs.unshift({ id: 'LOG-MPU', timestamp: now - 900, level: 'debug', source: 'MPU', robotId, message: `MPU cập nhật hướng: yaw=${telemetry.mpu.yawDeg ?? 'Chưa có'}` });

  if (telemetry.currentTask) {
    logs.unshift({ id: 'LOG-TASK', timestamp: now - 1200, level: 'info', source: 'Task', robotId, message: `Đã nhận nhiệm vụ: ${telemetry.currentTask.taskId} / ${telemetry.currentTask.currentStep}` });
  }
  if (telemetry.motion.currentEdge) {
    logs.unshift({ id: 'LOG-EDGE', timestamp: now - 1500, level: 'info', source: 'Traffic', robotId, message: `Đang di chuyển trên cạnh ${telemetry.motion.currentEdge}` });
  }
  if (telemetry.obstacle.ultrasonicDistance != null && telemetry.obstacle.ultrasonicDistance < 50) {
    logs.unshift({ id: 'LOG-OBSTACLE', timestamp: now - 1800, level: 'warning', source: 'An toàn', robotId, message: `Phát hiện vật cản ở khoảng cách ${telemetry.obstacle.ultrasonicDistance.toFixed(0)}cm` });
  }
  if (getBatteryDisplay(telemetry.power).percentLabel === 'Chưa đo') {
    logs.unshift({ id: 'LOG-BATTERY', timestamp: now - 2100, level: 'info', source: 'Power', robotId, message: 'Chưa có dữ liệu pin: chưa đo điện áp bằng ADC' });
  }

  return logs;
}
