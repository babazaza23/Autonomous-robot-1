import { useMemo } from 'react';
import type { RobotTelemetryState } from '../types/robot';

export interface TrafficDisplayState {
  nodeOccupancy: Array<{ nodeId: string; robotId: string }>;
  edgeOccupancy: Array<{ edgeId: string; robotId: string }>;
  reservedEdges: Array<{ edgeId: string; robotId: string }>;
  waitingRobots: Array<{ robotId: string; reason: string }>;
  conflicts: Array<{ type: 'NODE' | 'EDGE'; id: string; robots: string[] }>;
}

export function useTrafficManager(robotTelemetry: RobotTelemetryState): TrafficDisplayState {
  return useMemo(() => {
    const telemetryList = Object.values(robotTelemetry.telemetryByRobotId);
    const nodeMap = new Map<string, string[]>();
    const edgeMap = new Map<string, string[]>();
    const nodeOccupancy: TrafficDisplayState['nodeOccupancy'] = [];
    const edgeOccupancy: TrafficDisplayState['edgeOccupancy'] = [];
    const reservedEdges: TrafficDisplayState['reservedEdges'] = [];
    const waitingRobots: TrafficDisplayState['waitingRobots'] = [];

    for (const telemetry of telemetryList) {
      const robotId = telemetry.robotId;
      if (telemetry.motion.currentNode) {
        nodeOccupancy.push({ nodeId: telemetry.motion.currentNode, robotId });
        nodeMap.set(telemetry.motion.currentNode, [...(nodeMap.get(telemetry.motion.currentNode) ?? []), robotId]);
      }

      if (telemetry.motion.currentEdge) {
        edgeOccupancy.push({ edgeId: telemetry.motion.currentEdge, robotId });
        edgeMap.set(telemetry.motion.currentEdge, [...(edgeMap.get(telemetry.motion.currentEdge) ?? []), robotId]);
      }

      if (telemetry.state === 'EDGE_RESERVED' && telemetry.motion.currentEdge) {
        reservedEdges.push({ edgeId: telemetry.motion.currentEdge, robotId });
      }

      if (telemetry.state === 'WAITING_TRAFFIC' || telemetry.state === 'TRAFFIC_BLOCKED') {
        waitingRobots.push({ robotId, reason: telemetry.state });
      }
    }

    const conflicts: TrafficDisplayState['conflicts'] = [
      ...Array.from(nodeMap.entries())
        .filter(([, robots]) => robots.length > 1)
        .map(([id, robots]) => ({ type: 'NODE' as const, id, robots })),
      ...Array.from(edgeMap.entries())
        .filter(([, robots]) => robots.length > 1)
        .map(([id, robots]) => ({ type: 'EDGE' as const, id, robots })),
    ];

    return { nodeOccupancy, edgeOccupancy, reservedEdges, waitingRobots, conflicts };
  }, [robotTelemetry.telemetryByRobotId]);
}
