"""Robot command queue management."""

from typing import Any

from config import DEFAULT_ROBOT_ID
from utils import normalize_robot_id, now_ms

# Global state
robot_command_queues_by_id: dict[str, list[dict[str, Any]]] = {}
robot_command_history_by_id: dict[str, dict[str, dict[str, Any]]] = {}


def append_command(robot_id: str, command: dict[str, Any]) -> dict[str, Any]:
    """Add a command to robot's queue."""
    command_id = command.get("commandId") or f"CMD-{now_ms()}"
    payload = {
        "commandId": command_id,
        "robotId": robot_id,
        "createdAt": now_ms(),
        "safetyEnabled": True,
        **command,
        "commandId": command_id,
        "robotId": robot_id,
    }
    robot_command_queues_by_id.setdefault(robot_id, []).append(payload)
    robot_command_history_by_id.setdefault(robot_id, {})[command_id] = payload
    return payload


def pop_next_command(robot_id: str) -> dict[str, Any] | None:
    """Pop the next command for a robot without crossing robot queues."""
    queue = robot_command_queues_by_id.setdefault(robot_id, [])
    command = queue.pop(0) if queue else None
    if command is not None:
        command["status"] = "DELIVERED_TO_ROBOT"
        command["deliveredAt"] = now_ms()
        robot_command_history_by_id.setdefault(robot_id, {})[command["commandId"]] = command
    return command


def acknowledge_command(robot_id: str, command_id: str | None, ack: bool) -> dict[str, Any] | None:
    """Update a command ACK state if the command is known."""
    if not command_id:
        return None
    command = robot_command_history_by_id.setdefault(robot_id, {}).get(command_id)
    if command is None:
        return None
    command["ack"] = ack
    command["ackStatus"] = "ACKED" if ack else "REJECTED"
    command["acknowledgedAt"] = now_ms()
    return command
