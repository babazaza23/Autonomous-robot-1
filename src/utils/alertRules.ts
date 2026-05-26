import { Alert, AlertType, AlertSeverity } from '../types/alert';
import { RobotTelemetry } from '../types/robot';
import { DEFAULT_THRESHOLDS } from '../types/sensor';

let alertCounter = 100;

function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  robotId: string,
  message: string,
  details: string
): Alert {
  alertCounter++;
  return {
    id: `ALT-${alertCounter}`,
    type, severity, robotId, message, details,
    timestamp: Date.now(),
    acknowledged: false, acknowledgedAt: null,
    autoResolved: false, resolvedAt: null,
  };
}

export function checkTelemetryAlerts(robotId: string, telemetry: RobotTelemetry): Alert[] {
  const alerts: Alert[] = [];
  const t = DEFAULT_THRESHOLDS;

  if (telemetry.ultrasonicDistance < t.ultrasonicObstacle) {
    alerts.push(createAlert('obstacle_detected', 'warning', robotId,
      `Vật cản ở khoảng cách ${telemetry.ultrasonicDistance.toFixed(1)}cm`,
      `Khoảng cách siêu âm thấp hơn ngưỡng ${t.ultrasonicObstacle}cm.`));
  }

  if (telemetry.battery < 20) {
    alerts.push(createAlert(telemetry.battery < 10 ? 'critical_battery' : 'low_battery',
      telemetry.battery < 10 ? 'critical' : 'warning', robotId,
      `Pin còn ${telemetry.battery.toFixed(0)}%`,
      telemetry.battery < 10 ? 'Pin ở mức rất thấp.' : 'Pin ở mức thấp.'));
  }

  const lineThreshold = t.irLineThreshold;
  if (telemetry.irSensors.left < lineThreshold && telemetry.irSensors.center < lineThreshold && telemetry.irSensors.right < lineThreshold) {
    alerts.push(createAlert('line_lost', 'critical', robotId,
      'Mất line - tất cả cảm biến IR dưới ngưỡng',
      `IR: L=${telemetry.irSensors.left.toFixed(0)} C=${telemetry.irSensors.center.toFixed(0)} R=${telemetry.irSensors.right.toFixed(0)}`));
  } else if (telemetry.irSensors.center < lineThreshold) {
    alerts.push(createAlert('line_faded', 'info', robotId,
      'Tín hiệu line trung tâm yếu',
      `Center IR sensor: ${telemetry.irSensors.center.toFixed(0)}`));
  }

  if (telemetry.motorCurrentLeft > t.motorCurrentMax || telemetry.motorCurrentRight > t.motorCurrentMax) {
    alerts.push(createAlert('motor_stall', 'warning', robotId,
      'Dòng motor cao',
      `L: ${telemetry.motorCurrentLeft.toFixed(0)}mA, R: ${telemetry.motorCurrentRight.toFixed(0)}mA`));
  }

  if (telemetry.uartStatus !== 'connected') {
    alerts.push(createAlert('uart_disconnected', 'critical', robotId,
      'UART mất kết nối', 'ESP32-S3 mất giao tiếp với Arduino UNO.'));
  }

  if (telemetry.mqttLatency > 150) {
    alerts.push(createAlert('mqtt_disconnected', 'warning', robotId,
      `Độ trễ MQTT cao: ${telemetry.mqttLatency.toFixed(0)}ms`,
      'Kết nối MQTT có thể không ổn định.'));
  }

  return alerts;
}
