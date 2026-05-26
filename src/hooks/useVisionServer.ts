import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ROBOT_ID } from '../types/robot';

function defaultAiServerHost() {
  const envHost = import.meta.env.VITE_AI_SERVER_HOST as string | undefined;
  if (envHost) return envHost;
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.hostname}:8000`;
  }
  return '127.0.0.1:8000';
}

export const DEFAULT_AI_SERVER_HOST = defaultAiServerHost();

export type VisionAlertLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VisionDetectionType =
  | 'PERSON_MOVING'
  | 'PERSON_NEAR_PATH'
  | 'OBSTACLE_MOVING'
  | 'OBSTACLE_STATIC';

export interface VisionBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisionMotion {
  moving: boolean;
  speedPxPerSec: number;
  dx: number;
  dy: number;
  direction: string;
  areaDeltaPerSec: number;
}

export interface VisionDetection {
  type: VisionDetectionType;
  objectType: 'PERSON' | 'OBSTACLE';
  label: string;
  rawLabel: string;
  confidence: number;
  bbox: VisionBoundingBox;
  areaRatio: number;
  level: VisionAlertLevel;
  trackId?: number;
  stableFrames?: number;
  motion?: VisionMotion;
  action?: string;
  turnAngle?: number | null;
  turnDirection?: string | null;
  recheckAfterMs?: number | null;
  message?: string;
  source: 'yolo' | 'opencv' | 'opencv_motion' | 'opencv_static';
  sourceDetail?: 'opencv_motion' | 'opencv_static';
  debug?: {
    source: 'yolo' | 'opencv_motion' | 'opencv_static' | string;
    validBbox: boolean;
    areaRatio: number;
    roiPassed: boolean;
    backgroundCalibrated: boolean;
    blockingPath?: boolean;
    monitorOnly?: boolean;
  };
}

export interface VisionAlert {
  type: VisionDetectionType;
  level: VisionAlertLevel;
  action?: string;
  turnAngle?: number | null;
  turnDirection?: string | null;
  recheckAfterMs?: number | null;
  message: string;
}

export interface VisionResult {
  timestamp: number;
  robotId: string;
  detected: boolean;
  detections: VisionDetection[];
  alert: VisionAlert | null;
  imageUrl: string;
  performance?: Record<string, unknown>;
  latency?: Record<string, unknown>;
  safetyState?: Record<string, unknown>;
}

interface VisionSocketEnvelope {
  type?: string;
  event?: string;
  robotId?: string;
  timestamp?: number;
  data?: VisionResult;
}

interface UseVisionServerState {
  connected: boolean;
  result: VisionResult | null;
  resultByRobotId: Record<string, VisionResult>;
  imageSrc: string | null;
  error: string | null;
  normalizedHost: string;
  apiBaseUrl: string;
}

function normalizeServerHost(serverHost: string) {
  return serverHost
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^wss?:\/\//, '')
    .replace(/\/+$/, '');
}

function protocolPair() {
  const httpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return {
    http: httpsPage ? 'https' : 'http',
    ws: httpsPage ? 'wss' : 'ws',
  };
}

function hasValidTimestamp(result: VisionResult | null): result is VisionResult {
  return Boolean(result && Number.isFinite(result.timestamp) && result.timestamp > 0);
}

function normalizeVisionMessage(payload: VisionResult | VisionSocketEnvelope, fallbackRobotId: string): VisionResult | null {
  const maybeEnvelope = payload as VisionSocketEnvelope;
  const result = maybeEnvelope.data && typeof maybeEnvelope.data === 'object'
    ? maybeEnvelope.data
    : payload as VisionResult;

  if (!result || typeof result !== 'object') return null;

  return {
    ...result,
    robotId: result.robotId || maybeEnvelope.robotId || fallbackRobotId,
    detections: Array.isArray(result.detections) ? result.detections : [],
    alert: result.alert ?? null,
    detected: Boolean(result.detected),
  };
}

export function useVisionServer(
  serverHost: string = DEFAULT_AI_SERVER_HOST,
  enabled = true,
  selectedRobotId = DEFAULT_ROBOT_ID,
): UseVisionServerState {
  const [connected, setConnected] = useState(false);
  const [resultByRobotId, setResultByRobotId] = useState<Record<string, VisionResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const normalizedHost = useMemo(() => normalizeServerHost(serverHost), [serverHost]);
  const protocols = useMemo(() => protocolPair(), []);
  const apiBaseUrl = useMemo(
    () => normalizedHost ? `${protocols.http}://${normalizedHost}` : '',
    [normalizedHost, protocols.http],
  );
  const wsBaseUrl = useMemo(
    () => normalizedHost ? `${protocols.ws}://${normalizedHost}` : '',
    [normalizedHost, protocols.ws],
  );

  const result = resultByRobotId[selectedRobotId] ?? null;

  const imageSrc = useMemo(() => {
    if (!apiBaseUrl) return null;
    const ts = result?.timestamp ?? refreshKey;
    return `${apiBaseUrl}/api/latest-frame?robotId=${encodeURIComponent(selectedRobotId)}&t=${ts}`;
  }, [apiBaseUrl, refreshKey, result?.timestamp, selectedRobotId]);

  useEffect(() => {
    if (!enabled || hasValidTimestamp(result)) return;
    const timer = window.setInterval(() => setRefreshKey(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [enabled, result]);

  useEffect(() => {
    if (!enabled || !wsBaseUrl) {
      const timer = window.setTimeout(() => setConnected(false), 0);
      return () => window.clearTimeout(timer);
    }

    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();

      try {
        const websocket = new WebSocket(`${wsBaseUrl}/ws/vision`);
        socketRef.current = websocket;

        websocket.onopen = () => {
          if (disposed) return;
          setConnected(true);
          setError(null);
        };

        websocket.onmessage = event => {
          if (disposed) return;
          try {
            const payload = JSON.parse(event.data) as VisionResult | VisionSocketEnvelope;
            const next = normalizeVisionMessage(payload, selectedRobotId);
            if (!next) return;
            setResultByRobotId(prev => ({ ...prev, [next.robotId]: next }));
          } catch {
            setError('Không đọc được dữ liệu từ AI Server.');
          }
        };

        websocket.onerror = () => {
          if (disposed) return;
          setConnected(false);
          setError('Chưa kết nối được AI Server. Kiểm tra server hoặc IP LAN.');
        };

        websocket.onclose = () => {
          if (disposed) return;
          setConnected(false);
          reconnectTimerRef.current = window.setTimeout(connect, 2500);
        };
      } catch {
        setConnected(false);
        setError('Chưa kết nối được AI Server. Kiểm tra server hoặc IP LAN.');
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      }
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, selectedRobotId, wsBaseUrl]);

  useEffect(() => {
    if (!enabled || !apiBaseUrl) return;

    let disposed = false;
    const fetchLatest = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/latest-result?robotId=${encodeURIComponent(selectedRobotId)}&t=${Date.now()}`,
          { cache: 'no-store' },
        );
        if (!response.ok || disposed) {
          if (!connected) setError('Chưa kết nối được AI Server. Kiểm tra server hoặc IP LAN.');
          return;
        }
        const payload = await response.json() as VisionResult;
        const next = normalizeVisionMessage(payload, selectedRobotId);
        if (next) {
          setResultByRobotId(prev => ({ ...prev, [next.robotId]: next }));
          setError(null);
        }
      } catch {
        if (!connected && !disposed) {
          setError('Chưa kết nối được AI Server. Kiểm tra server hoặc IP LAN.');
        }
      }
    };

    fetchLatest();
    const timer = window.setInterval(fetchLatest, 1000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, connected, enabled, selectedRobotId]);

  return { connected, result, resultByRobotId, imageSrc, error, normalizedHost, apiBaseUrl };
}
