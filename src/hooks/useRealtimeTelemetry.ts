import { useState, useEffect, useCallback, useRef } from 'react';
import { RobotTelemetry } from '../types/robot';
import { generateTelemetry } from '../utils/generateTelemetry';
import { mockRobots } from '../data/mockRobots';

interface TelemetryState {
  [robotId: string]: {
    current: RobotTelemetry;
    history: RobotTelemetry[];
  };
}

export function useRealtimeTelemetry(demoMode: boolean, intervalMs: number = 1500) {
  const [telemetry, setTelemetry] = useState<TelemetryState>(() => {
    const init: TelemetryState = {};
    for (const robot of mockRobots) {
      init[robot.id] = { current: robot.telemetry, history: [robot.telemetry] };
    }
    return init;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTelemetry = useCallback(() => {
    setTelemetry(prev => {
      const next = { ...prev };
      for (const robotId of Object.keys(next)) {
        const robot = mockRobots.find(r => r.id === robotId);
        const isMoving = robot?.status === 'moving';
        const newTelemetry = generateTelemetry(next[robotId].current, isMoving);
        const history = [...next[robotId].history, newTelemetry].slice(-60);
        next[robotId] = { current: newTelemetry, history };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (demoMode) {
      intervalRef.current = setInterval(updateTelemetry, intervalMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [demoMode, intervalMs, updateTelemetry]);

  return telemetry;
}
