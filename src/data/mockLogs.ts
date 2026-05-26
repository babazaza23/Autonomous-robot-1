export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  robotId: string | null;
  message: string;
}

const now = Date.now();

export const mockLogs: LogEntry[] = [
  { id: 'LOG-001', timestamp: now - 1000, level: 'info', source: 'WMS', robotId: 'robot-01', message: 'Robot đã đăng ký' },
  { id: 'LOG-002', timestamp: now - 2000, level: 'info', source: 'Telemetry', robotId: 'robot-01', message: 'Đang chờ heartbeat từ ESP32-S3' },
  { id: 'LOG-003', timestamp: now - 3000, level: 'info', source: 'Power', robotId: 'robot-01', message: 'Chưa có dữ liệu pin cho đến khi đo packVoltage' },
];
