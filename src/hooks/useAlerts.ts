import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '../types/alert';
import { RobotTelemetry } from '../types/robot';
import { mockAlerts } from '../data/mockAlerts';
import { checkTelemetryAlerts } from '../utils/alertRules';
import type { VisionResult } from './useVisionServer';

export function useAlerts(
  demoMode: boolean,
  telemetryMap: Record<string, { current: RobotTelemetry }>
) {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!demoMode) return;
    const now = Date.now();
    if (now - lastCheckRef.current < 5000) return; // throttle: every 5s
    lastCheckRef.current = now;

    const timer = window.setTimeout(() => {
      for (const [robotId, data] of Object.entries(telemetryMap)) {
        const newAlerts = checkTelemetryAlerts(robotId, data.current);
        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [demoMode, telemetryMap]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt: Date.now() } : a
    ));
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAlerts(prev => prev.map(a =>
      !a.acknowledged ? { ...a, acknowledged: true, acknowledgedAt: Date.now() } : a
    ));
  }, []);

  const clearResolved = useCallback(() => {
    setAlerts(prev => prev.filter(a => !a.autoResolved || !a.acknowledged));
  }, []);

  const addVisionAlert = useCallback((result: VisionResult) => {
    if (!result.alert) return;

    const isPerson = result.alert.type === 'PERSON_MOVING';
    const isCritical = result.alert.level === 'CRITICAL';
    const actionText = result.alert.action ? ` H · nh động: ${result.alert.action}.` : '';
    const turnText = typeof result.alert.turnAngle === 'number' ? ` Góc rẽ: ${result.alert.turnAngle}°.` : '';
    const recheckText = typeof result.alert.recheckAfterMs === 'number' ? ` Kiểm tra lại sau: ${result.alert.recheckAfterMs}ms.` : '';

    const alert: Alert = {
      id: `VISION-${result.timestamp}`,
      type: isPerson ? 'person_detected' : 'obstacle_detected',
      severity: isPerson || isCritical ? 'critical' : 'warning',
      robotId: result.robotId,
      message: result.alert.message,
      details: `AI Vision Server phát hiện ${result.detections.length} đối tượng từ frame ESP32-S3.${actionText}${turnText}${recheckText}`,
      timestamp: result.timestamp,
      acknowledged: false,
      acknowledgedAt: null,
      autoResolved: false,
      resolvedAt: null,
    };

    setAlerts(prev => {
      if (prev.some(item => item.id === alert.id)) return prev;
      return [alert, ...prev].slice(0, 50);
    });
  }, []);

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return { alerts, acknowledgeAlert, acknowledgeAll, clearResolved, addVisionAlert, unacknowledgedCount };
}
