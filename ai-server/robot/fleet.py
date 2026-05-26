"""Fleet safety and traffic management."""

from typing import Any

from utils import now_ms, normalize_robot_id
from robot.telemetry import robot_online, latest_robot_telemetry_by_id, extract_robot_pose
from robot.commands import robot_command_queues_by_id, append_command

# Global state
traffic_state: dict[str, Any] = {
    "nodeOccupancy": {},
    "edgeOccupancy": {},
    "reservedNodes": {},
    "reservedEdges": {},
    "blockedEdges": [],
    "waitingRobots": {},
    "conflicts": [],
    "zoneReservations": {},
}


def update_fleet_safety(robot_id: str, telemetry: dict[str, Any]) -> dict[str, Any]:
    """Update fleet safety state based on robot telemetry."""
    pose = extract_robot_pose(telemetry)
    zone_id = pose.get("zoneId")
    reserved_zone = pose.get("reservedZone") or zone_id
    suggested = "FOLLOW_LINE"
    conflict: dict[str, Any] | None = None

    if reserved_zone:
        reservation_owner = traffic_state["zoneReservations"].get(reserved_zone)
        if reservation_owner and reservation_owner != robot_id and robot_online(reservation_owner):
            suggested = "YIELD_OR_WAIT"
            conflict = {
                "zoneId": reserved_zone,
                "robotId": robot_id,
                "otherRobotId": reservation_owner,
                "detectedAt": now_ms(),
                "rule": "WAIT",
            }
        else:
            traffic_state["zoneReservations"][reserved_zone] = robot_id

    for other_id, other in latest_robot_telemetry_by_id.items():
        if other_id == robot_id or not robot_online(other_id):
            continue
        other_pose = other.get("pose") or extract_robot_pose(other)
        if zone_id and other_pose.get("zoneId") == zone_id:
            suggested = "YIELD_OR_WAIT"
            conflict = {
                "zoneId": zone_id,
                "robotId": robot_id,
                "otherRobotId": other_id,
                "detectedAt": now_ms(),
                "rule": "YIELD_OR_WAIT",
            }
            break

    if conflict:
        traffic_state["conflicts"] = [
            item for item in traffic_state.get("conflicts", [])
            if item.get("robotId") != robot_id
        ][-10:] + [conflict]
        queue = robot_command_queues_by_id.setdefault(robot_id, [])
        if not any(cmd.get("command") == "WAIT" and cmd.get("reason") == "FLEET_CONFLICT" for cmd in queue):
            append_command(robot_id, {
                "command": "WAIT",
                "reason": "FLEET_CONFLICT",
                "zoneId": conflict.get("zoneId"),
                "otherRobotId": conflict.get("otherRobotId"),
            })

    return {
        "pose": pose,
        "suggestedRobotState": suggested,
        "conflict": conflict,
        "note": "Basic in-memory fleet safety. TODO: replace with warehouse map, zone reservation and path planning.",
    }
