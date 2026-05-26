"""Robot management module."""

from .telemetry import (
    register_robot_if_needed,
    robot_online,
    enrich_robot,
    extract_robot_pose,
)
from .commands import append_command
from .fleet import update_fleet_safety

__all__ = [
    "register_robot_if_needed",
    "robot_online",
    "enrich_robot",
    "extract_robot_pose",
    "append_command",
    "update_fleet_safety",
]
