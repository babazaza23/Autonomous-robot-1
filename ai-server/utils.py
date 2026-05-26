"""Utility functions and helpers."""

import re
import time
from pathlib import Path
from typing import Any

from config import DEFAULT_ROBOT_ID, FRAMES_DIR

# Global state
vision_sessions_by_robot_id: dict[str, Any] = {}


def now_ms() -> int:
    """Get current timestamp in milliseconds."""
    return int(time.time() * 1000)


def normalize_robot_id(robot_id: str | None) -> str:
    """Normalize and validate robot ID."""
    cleaned = str(robot_id or "").strip()
    return cleaned or DEFAULT_ROBOT_ID


def get_vision_session(robot_id: str | None = None) -> Any:
    """Get or create vision session for a robot."""
    from models import VisionSession

    normalized = normalize_robot_id(robot_id)
    session = vision_sessions_by_robot_id.get(normalized)
    if session is None:
        session = VisionSession()
        vision_sessions_by_robot_id[normalized] = session
    return session


def current_vision_session(robot_id: str | None = None) -> Any:
    """Get a vision session for a robot.

    Kept for older call sites, but callers should pass robot_id explicitly.
    """
    return get_vision_session(robot_id)


def safe_robot_filename(robot_id: str) -> str:
    """Convert robot ID to safe filename."""
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", normalize_robot_id(robot_id))


def frame_path_for_robot(robot_id: str) -> Path:
    """Get frame file path for a robot."""
    return FRAMES_DIR / f"latest_{safe_robot_filename(robot_id)}.jpg"


def clamp(value: float, minimum: float, maximum: float) -> float:
    """Clamp a value between min and max."""
    return max(minimum, min(maximum, value))


def make_vision_ws_payload(result: dict[str, Any]) -> dict[str, Any]:
    """Create WebSocket payload for vision results."""
    return {
        "type": "vision_result",
        "event": "VISION_RESULT",
        "robotId": result.get("robotId", DEFAULT_ROBOT_ID),
        "timestamp": result.get("timestamp", now_ms()),
        "data": result,
        **result,
    }


def make_robot_ws_payload(event: str, robot_id: str, data: dict[str, Any], **extra: Any) -> dict[str, Any]:
    """Create WebSocket payload for robot events."""
    timestamp = int(data.get("timestamp") or data.get("receivedAt") or now_ms())
    payload = {
        "type": event.lower(),
        "event": event,
        "robotId": robot_id,
        "timestamp": timestamp,
        "data": data,
        **extra,
    }
    return payload
