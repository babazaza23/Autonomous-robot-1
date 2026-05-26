"""Simulate ESP32-S3 robot telemetry for the WMS dashboard.

Run the FastAPI server first:
    uvicorn main:app --host 0.0.0.0 --port 8000

Then run:
    python robot_telemetry_simulator.py

Optional:
    python robot_telemetry_simulator.py --robot-id robot-02 --color BLUE
    python robot_telemetry_simulator.py --count 3

Stop this script and the web UI should mark the robot Offline after about 5 seconds.
"""

from __future__ import annotations

import argparse
import math
import time
from typing import Any

import requests

DEFAULT_SERVER = "http://127.0.0.1:8000"

COLOR_CONFIG = {
    "RED": {"itemId": "RED_BLOCK", "dropNode": "C1", "path": ["A0", "A1", "B1", "C1"]},
    "BLUE": {"itemId": "BLUE_BLOCK", "dropNode": "C2", "path": ["A0", "A1", "B1", "B2", "C2"]},
    "YELLOW": {"itemId": "YELLOW_BLOCK", "dropNode": "C3", "path": ["A0", "A1", "B2", "C3"]},
}

WORKFLOW = [
    "POWER_ON",
    "CONNECTING_SERVER",
    "WAITING_TASK",
    "PLAN_ROUTE",
    "MOVE_TO_PICKUP",
    "ARRIVED_PICKUP",
    "IDENTIFY_ITEM",
    "GRIP_ITEM",
    "ITEM_GRIPPED",
    "MOVE_TO_DROP",
    "ARRIVED_DROP",
    "RELEASE_ITEM",
    "ITEM_RELEASED",
    "TASK_COMPLETED",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default=DEFAULT_SERVER)
    parser.add_argument("--server-url", default=None, help="Legacy full telemetry endpoint URL.")
    parser.add_argument("--robot-id", default="robot-01")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--color", choices=sorted(COLOR_CONFIG), default="RED")
    parser.add_argument("--interval", type=float, default=1.0)
    args = parser.parse_args()

    server_url = args.server_url or f"{args.server.rstrip('/')}/api/robot/telemetry"
    print(f"POST telemetry to {server_url}")
    print(f"Robot: {args.robot_id} | Count: {args.count} | Color: {args.color}")
    print("Press Ctrl+C to stop.")

    tick = 0
    try:
        while True:
            for index in range(max(args.count, 1)):
                robot_id = args.robot_id if args.count == 1 else f"robot-{index + 1:02d}"
                color = list(COLOR_CONFIG)[index % len(COLOR_CONFIG)]
                telemetry = build_telemetry(robot_id, color if args.count > 1 else args.color, tick + index)
                try:
                    response = requests.post(server_url, json=telemetry, timeout=3)
                    print(response.status_code, telemetry["robotId"], telemetry["state"], telemetry["motion"]["currentNode"], telemetry["motion"]["currentEdge"])
                except requests.RequestException as exc:
                    print("POST failed:", exc)

            tick += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")


def build_telemetry(robot_id: str, color: str, tick: int) -> dict[str, Any]:
    config = COLOR_CONFIG[color]
    state = WORKFLOW[min(tick // 4, len(WORKFLOW) - 1)]
    path = config["path"]
    path_index = min(max((tick - 12) // 4, 0), len(path) - 1)
    current_node = path[path_index]
    next_node = path[path_index + 1] if path_index + 1 < len(path) and state in {"MOVE_TO_PICKUP", "MOVE_TO_DROP"} else None
    current_edge = f"{current_node}-{next_node}" if next_node else None
    holding_item = state in {"ITEM_GRIPPED", "MOVE_TO_DROP", "ARRIVED_DROP", "RELEASE_ITEM"}
    distance = max(tick - 8, 0) * 8.5
    progress = min(100, int((tick / (len(WORKFLOW) * 4)) * 100))

    task = None
    if state not in {"POWER_ON", "CONNECTING_SERVER", "WAITING_TASK"}:
        task = {
            "taskId": "TASK-SIM-001",
            "robotId": robot_id,
            "itemId": config["itemId"],
            "color": color,
            "pickupNode": "A1",
            "dropNode": config["dropNode"],
            "path": path,
            "currentStep": state,
            "progress": progress,
            "status": "COMPLETED" if state == "TASK_COMPLETED" else "IN_PROGRESS",
            "startedAt": int(time.time() * 1000) - tick * 1000,
            "completedAt": int(time.time() * 1000) if state == "TASK_COMPLETED" else None,
        }

    return {
        "robotId": robot_id,
        "timestamp": int(time.time() * 1000),
        "state": state,
        "mode": "SIMULATOR",
        "source": "simulator",
        "battery": 87,
        "speed": 0.18 if current_edge else 0,
        "lineDetected": True,
        "ultrasonicFrontCm": round(80 + 8 * math.sin(tick / 4), 2),
        "ultrasonicLeftCm": 42,
        "ultrasonicRightCm": 45,
        "encoderLeft": tick * 126,
        "encoderRight": tick * 124,
        "zoneId": current_node,
        "connection": {"esp32": True, "uno": True, "uart": True, "wifi": True, "server": True},
        "power": {
            "source": "3S_18650_BATTERY_HOLDER",
            "packVoltage": None,
            "batteryPercent": None,
            "note": "Battery voltage not measured",
        },
        "line": {"irLeft": 0, "irCenter": 1, "irRight": 0, "lineStatus": "NORMAL_LINE"},
        "obstacle": {"ultrasonicDistance": 80 + 8 * math.sin(tick / 4), "status": "CLEAR"},
        "encoder": {
            "leftTicks": tick * 126,
            "rightTicks": tick * 124,
            "leftDistanceCm": distance,
            "rightDistanceCm": distance * 0.98,
            "distanceTravelledCm": distance,
            "linearVelocityCms": 18 if current_edge else 0,
            "angularVelocityDegs": 2.2 if current_edge else 0,
            "status": "OK",
        },
        "mpu": {
            "connected": True,
            "yawDeg": (tick * 5) % 360,
            "gyroZ": 2.2 if current_edge else 0,
            "accelX": 0,
            "accelY": 0,
            "yaw": (tick * 5) % 360,
            "pitch": 0,
            "roll": 0,
            "headingStatus": "OK",
        },
        "localization": {
            "method": "ENCODER_MPU_ODOMETRY",
            "estimatedX": distance * 0.7,
            "estimatedY": 14 * math.sin(tick / 6),
            "estimatedTheta": (tick * 5) % 360,
            "confidence": "MEDIUM",
            "driftWarning": False,
            "note": "Estimated by encoder and MPU, not absolute localization",
        },
        "motion": {
            "currentNode": current_node,
            "nextNode": next_node,
            "currentEdge": current_edge,
            "leftMotorCommand": 130 if current_edge else 0,
            "rightMotorCommand": 126 if current_edge else 0,
            "l298n": "OK",
        },
        "arm": {"base": 90, "shoulder": 90, "elbow": 90, "gripper": 45 if holding_item else 70, "holdingItem": holding_item},
        "camera": {
            "connected": True,
            "mode": "EVENT_SNAPSHOT",
            "lastFrameAt": int(time.time() * 1000) if state in {"IDENTIFY_ITEM", "GRIP_ITEM"} else None,
            "lastFrameReason": "PICKUP_SCAN" if state == "IDENTIFY_ITEM" else None,
            "lastDetectedColor": color if state in {"IDENTIFY_ITEM", "GRIP_ITEM", "ITEM_GRIPPED"} else None,
            "confidence": 0.92 if state in {"IDENTIFY_ITEM", "GRIP_ITEM", "ITEM_GRIPPED"} else None,
        },
        "currentTask": task,
    }


if __name__ == "__main__":
    main()
