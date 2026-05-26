import { useState, useCallback } from 'react';
import { Robot, RobotCommand, AckStatus } from '../types/robot';
import { mockRobots } from '../data/mockRobots';
import { simulateCommandAck } from '../utils/generateTelemetry';

export function useRobotState() {
  const [robots, setRobots] = useState<Robot[]>(mockRobots);

  const sendCommand = useCallback(async (robotId: string, command: Omit<RobotCommand, 'id' | 'timestamp' | 'ackStatus'>) => {
    const cmd: RobotCommand = {
      id: `CMD-${Date.now()}`,
      ...command,
      timestamp: Date.now(),
      ackStatus: 'pending' as AckStatus,
    };

    setRobots(prev => prev.map(r =>
      r.id === robotId
        ? { ...r, commandHistory: [cmd, ...r.commandHistory].slice(0, 20) }
        : r
    ));

    const result = await simulateCommandAck();

    setRobots(prev => prev.map(r => {
      if (r.id !== robotId) return r;
      const updatedHistory = r.commandHistory.map(c =>
        c.id === cmd.id
          ? { ...c, ackStatus: (result.ack ? 'ack' : 'nack') as AckStatus, ackTimestamp: Date.now() }
          : c
      );

      let newStatus = r.status;
      if (result.ack) {
        switch (command.type) {
          case 'MOVE': newStatus = 'moving'; break;
          case 'PICK': newStatus = 'picking'; break;
          case 'DROP': newStatus = 'dropping'; break;
          case 'STOP': newStatus = 'idle'; break;
          case 'HOME': newStatus = 'moving'; break;
          case 'CHARGE': newStatus = 'charging'; break;
        }
      }
      return { ...r, status: newStatus, commandHistory: updatedHistory };
    }));

    return result;
  }, []);

  const updateRobotPosition = useCallback((robotId: string, nodeId: string, x: number, y: number) => {
    setRobots(prev => prev.map(r =>
      r.id === robotId ? { ...r, position: { nodeId, x, y } } : r
    ));
  }, []);

  return { robots, sendCommand, updateRobotPosition, setRobots };
}
