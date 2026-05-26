"""Robot telemetry and registration management."""

from typing import Any

from config import DEFAULT_ROBOT_ID
from utils import normalize_robot_id, now_ms

# Global state
registered_robots: dict[str, dict[str, Any]] = {
    DEFAULT_ROBOT_ID: {
        "robotId": DEFAULT_ROBOT_ID,
        "name": "robot-01",
        "type": "Line-following AGV with ESP32-S3 + UNO R3",
        "status": "REGISTERED",
        "hardwareNote": "ESP32-S3-N16R8, UNO R3 UART, L298N, encoders, MPU, camera, MG90S arm",
        "registeredAt": now_ms(),
    }
}
latest_robot_telemetry_by_id: dict[str, dict[str, Any]] = {}


def register_robot_if_needed(robot_id: str) -> None:
    """Register a robot if not already registered."""
    if robot_id in registered_robots:
        return
    registered_robots[robot_id] = {
        "robotId": robot_id,
        "name": robot_id,
        "type": "Registered AGV",
        "status": "REGISTERED",
        "hardwareNote": "",
        "registeredAt": now_ms(),
    }


def robot_online(robot_id: str) -> bool:
    """Check if robot is online based on recent telemetry."""
    telemetry = latest_robot_telemetry_by_id.get(robot_id)
    if telemetry is None:
        return False
    received_at = telemetry.get("receivedAt", telemetry.get("timestamp", 0))
    return now_ms() - int(received_at) <= 5000


def enrich_robot(robot: dict[str, Any]) -> dict[str, Any]:
    """Add runtime information to robot data."""
    robot_id = robot["robotId"]
    return {
        **robot,
        "status": "ONLINE" if robot_online(robot_id) else robot.get("status", "REGISTERED"),
        "online": robot_online(robot_id),
        "latestTelemetry": latest_robot_telemetry_by_id.get(robot_id),
    }


def extract_robot_pose(telemetry: dict[str, Any]) -> dict[str, Any]:
    """Extract pose information from telemetry."""
    localization = telemetry.get("localization") or {}
    motion = telemetry.get("motion") or {}
    return {
        "x": localization.get("estimatedX"),
        "y": localization.get("estimatedY"),
        "heading": localization.get("estimatedTheta") or localization.get("heading"),
        "zoneId": telemetry.get("zoneId") or localization.get("zoneId") or motion.get("currentNode"),
        "currentNode": motion.get("currentNode"),
        "nextNode": motion.get("nextNode"),
        "reservedZone": telemetry.get("reservedZone") or motion.get("nextNode"),
        "reservedPath": telemetry.get("reservedPath") or motion.get("currentEdge"),
        "lastSeenAt": telemetry.get("receivedAt") or telemetry.get("timestamp") or now_ms(),
    }
