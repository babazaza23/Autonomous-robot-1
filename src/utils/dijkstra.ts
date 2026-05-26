import { WarehouseEdge } from '../types/map';
import { PathResult } from '../types/map';

interface Graph {
  [nodeId: string]: { [neighbor: string]: number };
}

export function buildGraph(edges: WarehouseEdge[]): Graph {
  const graph: Graph = {};
  for (const edge of edges) {
    if (!graph[edge.from]) graph[edge.from] = {};
    if (!graph[edge.to]) graph[edge.to] = {};
    graph[edge.from][edge.to] = edge.weight;
    if (edge.bidirectional) {
      graph[edge.to][edge.from] = edge.weight;
    }
  }
  return graph;
}

export function dijkstra(
  edges: WarehouseEdge[],
  start: string,
  end: string,
  robotSpeed: number = 0.3 // m/s
): PathResult {
  const graph = buildGraph(edges);
  const distances: { [node: string]: number } = {};
  const previous: { [node: string]: string | null } = {};
  const visited = new Set<string>();
  const nodes = Object.keys(graph);

  // Initialize
  for (const node of nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[start] = 0;

  while (visited.size < nodes.length) {
    // Find unvisited node with minimum distance
    let current: string | null = null;
    let minDist = Infinity;
    for (const node of nodes) {
      if (!visited.has(node) && distances[node] < minDist) {
        current = node;
        minDist = distances[node];
      }
    }

    if (current === null || current === end) break;
    visited.add(current);

    // Update neighbors
    const neighbors = graph[current] || {};
    for (const [neighbor, weight] of Object.entries(neighbors)) {
      if (visited.has(neighbor)) continue;
      const newDist = distances[current] + weight;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        previous[neighbor] = current;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = end;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  const totalDistance = distances[end] === Infinity ? -1 : distances[end];
  const estimatedTime = totalDistance > 0 ? totalDistance / robotSpeed : -1;

  return { path: totalDistance >= 0 ? path : [], totalDistance, estimatedTime };
}
