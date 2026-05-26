"""Robot API routes."""

import asyncio
from typing import Any

from fastapi import Body, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect

from config import DEFAULT_ROBOT_ID
from connection import VisionConnectionManager
from utils import normalize_robot_id, now_ms, make_robot_ws_payload
from robot.telemetry import (
    register_robot_if_needed,
    robot_online,
    enrich_robot,
    registered_robots,
    latest_robot_telemetry_by_id,
)
from robot.commands import robot_command_queues_by_id, append_command, pop_next_command, acknowledge_command
from robot.fleet import traffic_state, update_fleet_safety

# WebSocket manager for robot updates
robot_manager = VisionConnectionManager()

# Global state
robot_tasks_by_id: dict[str, list[dict[str, Any]]] = {}


def normalize_robot_telemetry_payload(telemetry: dict[str, Any], robot_id: str, timestamp: int) -> dict[str, Any]:
    """Normalize ESP32 flat telemetry into the nested UI contract."""
    battery = telemetry.get("battery")
    speed = telemetry.get("speed")
    line_detected = telemetry.get("lineDetected")
    ultrasonic_front = telemetry.get("ultrasonicFrontCm")
    encoder_left = telemetry.get("encoderLeft")
    encoder_right = telemetry.get("encoderRight")
    mpu = telemetry.get("mpu") if isinstance(telemetry.get("mpu"), dict) else {}
    source = telemetry.get("source")

    connection = {
        "esp32": True,
        "uno": telemetry.get("unoConnected", telemetry.get("uno")),
        "uart": telemetry.get("uartConnected", telemetry.get("uart")),
        "wifi": True,
        "server": True,
        **(telemetry.get("connection") if isinstance(telemetry.get("connection"), dict) else {}),
    }
    line = {
        "irLeft": telemetry.get("irLeft"),
        "irCenter": telemetry.get("irCenter"),
        "irRight": telemetry.get("irRight"),
        "lineStatus": "NORMAL_LINE" if line_detected is not False else "LOST_LINE",
        **(telemetry.get("line") if isinstance(telemetry.get("line"), dict) else {}),
    }
    obstacle = {
        "ultrasonicDistance": ultrasonic_front,
        "status": "CLEAR" if ultrasonic_front is None or float(ultrasonic_front) >= 50 else "NEAR",
        **(telemetry.get("obstacle") if isinstance(telemetry.get("obstacle"), dict) else {}),
    }
    encoder = {
        "leftTicks": encoder_left,
        "rightTicks": encoder_right,
        "leftDistanceCm": telemetry.get("leftDistanceCm"),
        "rightDistanceCm": telemetry.get("rightDistanceCm"),
        "distanceTravelledCm": telemetry.get("distanceTravelledCm"),
        "linearVelocityCms": speed,
        "angularVelocityDegs": telemetry.get("angularVelocityDegs"),
        "status": telemetry.get("encoderStatus", "OK"),
        **(telemetry.get("encoder") if isinstance(telemetry.get("encoder"), dict) else {}),
    }
    normalized_mpu = {
        "connected": telemetry.get("mpuConnected", True if mpu else None),
        "yawDeg": mpu.get("yaw", telemetry.get("yawDeg")),
        "gyroZ": telemetry.get("gyroZ"),
        "accelX": telemetry.get("accelX"),
        "accelY": telemetry.get("accelY"),
        "headingStatus": telemetry.get("headingStatus", "OK"),
        **mpu,
    }
    motion = {
        "currentNode": telemetry.get("currentNode") or telemetry.get("zoneId"),
        "nextNode": telemetry.get("nextNode"),
        "currentEdge": telemetry.get("currentEdge"),
        "leftMotorCommand": telemetry.get("leftMotorCommand"),
        "rightMotorCommand": telemetry.get("rightMotorCommand"),
        "l298n": telemetry.get("l298n", "OK"),
        **(telemetry.get("motion") if isinstance(telemetry.get("motion"), dict) else {}),
    }
    localization = {
        "method": telemetry.get("localizationMethod", "ENCODER_MPU_ODOMETRY"),
        "estimatedX": telemetry.get("estimatedX"),
        "estimatedY": telemetry.get("estimatedY"),
        "estimatedTheta": telemetry.get("estimatedTheta") or normalized_mpu.get("yawDeg"),
        "confidence": telemetry.get("confidence", "LOW"),
        "driftWarning": telemetry.get("driftWarning", False),
        "note": telemetry.get("localizationNote"),
        **(telemetry.get("localization") if isinstance(telemetry.get("localization"), dict) else {}),
    }
    power = {
        "source": telemetry.get("powerSource", "3S_18650_BATTERY_HOLDER"),
        "packVoltage": telemetry.get("packVoltage"),
        "batteryPercent": battery,
        "note": telemetry.get("powerNote"),
        **(telemetry.get("power") if isinstance(telemetry.get("power"), dict) else {}),
    }

    return {
        **telemetry,
        "robotId": robot_id,
        "timestamp": timestamp,
        "state": telemetry.get("state", "WAITING_TASK"),
        "mode": "SIMULATOR" if source == "simulator" else telemetry.get("mode", "AUTONOMOUS"),
        "connection": connection,
        "power": power,
        "line": line,
        "obstacle": obstacle,
        "encoder": encoder,
        "mpu": normalized_mpu,
        "localization": localization,
        "motion": motion,
        "arm": telemetry.get("arm") if isinstance(telemetry.get("arm"), dict) else {
            "base": telemetry.get("armBase"),
            "shoulder": telemetry.get("armShoulder"),
            "elbow": telemetry.get("armElbow"),
            "gripper": telemetry.get("armGripper"),
            "holdingItem": telemetry.get("holdingItem", False),
        },
        "camera": telemetry.get("camera") if isinstance(telemetry.get("camera"), dict) else {
            "connected": telemetry.get("cameraConnected"),
            "mode": telemetry.get("cameraMode", "EVENT_SNAPSHOT"),
            "lastFrameAt": telemetry.get("lastFrameAt"),
            "lastFrameReason": telemetry.get("lastFrameReason"),
            "lastDetectedColor": telemetry.get("lastDetectedColor"),
            "confidence": telemetry.get("cameraConfidence"),
        },
    }


def register_robot_routes(app: FastAPI) -> None:
    """Register all robot-related endpoints."""

    @app.post("/api/robots")
    async def add_robot(robot: dict[str, Any] = Body(...)) -> dict[str, Any]:
        """Register a new robot."""
        robot_id = normalize_robot_id(robot.get("robotId"))
        if not robot_id:
            raise HTTPException(status_code=400, detail="robotId is required")

        registered_robots[robot_id] = {
            "robotId": robot_id,
            "name": robot.get("name") or robot_id,
            "type": robot.get("type") or "Registered AGV",
            "status": "REGISTERED",
            "hardwareNote": robot.get("hardwareNote") or robot.get("note") or "",
            "registeredAt": robot.get("registeredAt") or now_ms(),
        }
        payload = enrich_robot(registered_robots[robot_id])
        await robot_manager.broadcast(make_robot_ws_payload(
            "ROBOT_REGISTERED",
            robot_id,
            payload,
            robot=payload,
            robots=[enrich_robot(r) for r in registered_robots.values()],
        ))
        return payload

    @app.get("/api/robots")
    async def list_robots() -> dict[str, Any]:
        """List all registered robots."""
        return {
            "timestamp": now_ms(),
            "robots": [enrich_robot(robot) for robot in registered_robots.values()],
            "traffic": traffic_state,
        }

    @app.get("/api/robots/{robot_id}")
    async def get_robot(robot_id: str) -> dict[str, Any]:
        """Get robot information."""
        if robot_id not in registered_robots:
            raise HTTPException(status_code=404, detail="Robot is not registered")
        return enrich_robot(registered_robots[robot_id])

    @app.get("/api/robots/{robot_id}/latest-result")
    async def get_robot_latest_result(robot_id: str) -> dict[str, Any]:
        """Get latest vision result for robot."""
        from api.vision_routes import get_latest_vision_result
        return get_latest_vision_result(robot_id)

    @app.get("/api/robots/{robot_id}/latest-frame")
    async def get_robot_latest_frame(robot_id: str) -> Any:
        """Get latest frame for robot."""
        from api.vision_routes import get_latest_frame_response
        return get_latest_frame_response(robot_id)

    @app.get("/api/robots/{robot_id}/telemetry/latest")
    async def get_robot_latest_telemetry(robot_id: str) -> dict[str, Any]:
        """Get latest telemetry for robot."""
        return await get_latest_robot_telemetry(robotId=robot_id)

    @app.get("/api/robots/{robot_id}/command")
    async def get_robot_command(robot_id: str) -> dict[str, Any]:
        """Get pending command for robot."""
        return await poll_robot_command(robotId=robot_id)

    @app.post("/api/robots/{robot_id}/task")
    async def create_robot_task_for_robot(robot_id: str, task: dict[str, Any] = Body(...)) -> dict[str, Any]:
        """Create task for robot."""
        return await create_robot_task({**task, "robotId": robot_id})

    @app.post("/api/robot/telemetry")
    async def receive_robot_telemetry(telemetry: dict[str, Any] = Body(...)) -> dict[str, Any]:
        """Receive robot telemetry."""
        robot_id = normalize_robot_id(telemetry.get("robotId"))
        if not robot_id:
            raise HTTPException(status_code=400, detail="robotId is required")

        register_robot_if_needed(robot_id)
        timestamp = int(telemetry.get("timestamp") or now_ms())
        enriched = normalize_robot_telemetry_payload(telemetry, robot_id, timestamp)
        enriched["receivedAt"] = now_ms()
        enriched["online"] = True
        fleet_safety = update_fleet_safety(robot_id, enriched)
        enriched["pose"] = fleet_safety["pose"]
        enriched["fleetSafety"] = fleet_safety
        if fleet_safety["suggestedRobotState"] != "FOLLOW_LINE":
            enriched["suggestedRobotState"] = fleet_safety["suggestedRobotState"]
        latest_robot_telemetry_by_id[robot_id] = enriched

        motion = enriched.get("motion") or {}
        current_node = motion.get("currentNode")
        current_edge = motion.get("currentEdge")
        if current_node:
            traffic_state["nodeOccupancy"][current_node] = robot_id
        if current_edge:
            traffic_state["edgeOccupancy"][current_edge] = robot_id

        if enriched.get("state") == "WAITING_TRAFFIC":
            traffic_state["waitingRobots"][robot_id] = {
                "node": current_node,
                "edge": current_edge,
                "updatedAt": enriched["receivedAt"],
            }
        else:
            traffic_state["waitingRobots"].pop(robot_id, None)

        payload = make_robot_ws_payload(
            "ROBOT_TELEMETRY",
            robot_id,
            enriched,
            telemetry=enriched,
            robots=[enrich_robot(robot) for robot in registered_robots.values()],
            traffic=traffic_state,
        )
        await robot_manager.broadcast(payload)
        return payload

    @app.get("/api/robot/latest")
    async def get_latest_robot_telemetry(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Get latest robot telemetry."""
        robot_id = normalize_robot_id(robotId)
        telemetry = latest_robot_telemetry_by_id.get(robot_id)
        robot = enrich_robot(registered_robots.get(robot_id, {
            "robotId": robot_id,
            "name": robot_id,
            "type": "Unregistered AGV",
            "status": "REGISTERED",
            "registeredAt": now_ms(),
        }))
        if telemetry:
            return {
                **telemetry,
                "serverTimestamp": now_ms(),
                "online": robot_online(robot_id),
                "telemetry": telemetry,
                "robot": robot,
                "traffic": traffic_state,
            }

        return {
            "timestamp": now_ms(),
            "robotId": robot_id,
            "online": robot_online(robot_id),
            "telemetry": telemetry,
            "robot": robot,
            "traffic": traffic_state,
        }

    @app.post("/api/robot/task")
    async def create_robot_task(task: dict[str, Any] = Body(...)) -> dict[str, Any]:
        """Create task for robot."""
        robot_id = normalize_robot_id(task.get("robotId"))
        register_robot_if_needed(robot_id)
        task_id = task.get("taskId") or f"TASK-{now_ms()}"
        payload = {
            "taskId": task_id,
            "robotId": robot_id,
            "status": "SENT_TO_ROBOT",
            "createdAt": now_ms(),
            **task,
            "taskId": task_id,
            "robotId": robot_id,
        }
        robot_tasks_by_id.setdefault(robot_id, []).append(payload)

        path = payload.get("path") or []
        command = {
            "command": "START_TASK",
            "taskId": task_id,
            "itemId": payload.get("itemId"),
            "color": payload.get("color"),
            "pickupNode": payload.get("pickupNode"),
            "dropNode": payload.get("dropNode"),
            "path": path,
        }
        queued_command = append_command(robot_id, command)
        await robot_manager.broadcast(make_robot_ws_payload(
            "TASK_CREATED",
            robot_id,
            payload,
            task=payload,
            command=queued_command,
        ))
        return {"task": payload, "command": queued_command}

    @app.get("/api/robot/command")
    async def poll_robot_command(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Poll for pending commands.

        ESP32-S3 gets a minimal `hasCommand` flag, while the older web/client
        contract keeps `robotId`, `command` and `queueLength`.
        """
        robot_id = normalize_robot_id(robotId)
        queue = robot_command_queues_by_id.setdefault(robot_id, [])
        command = pop_next_command(robot_id)
        return {
            "robotId": robot_id,
            "hasCommand": command is not None,
            "command": command,
            "queueLength": len(queue),
        }

    @app.post("/api/robot/ack")
    async def robot_ack(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
        """Acknowledge command receipt or progress from ESP32-S3.

        Body can stay simple: robotId, commandId, taskId, status. Supported
        statuses include RECEIVED, PICKED, DROPPED, COMPLETED, FAILED.
        """
        robot_id = normalize_robot_id(payload.get("robotId"))
        status = str(payload.get("status") or ("RECEIVED" if payload.get("ack", True) else "FAILED")).upper()
        ack_ok = bool(payload.get("ack", status not in {"FAILED", "REJECTED", "NACK"}))
        ack = {
            "event": "ROBOT_ACK",
            "robotId": robot_id,
            "commandId": payload.get("commandId"),
            "taskId": payload.get("taskId"),
            "status": status,
            "ack": ack_ok,
            "message": payload.get("message", f"ESP32-S3 báo trạng thái {status}"),
            "timestamp": now_ms(),
        }
        command = acknowledge_command(robot_id, payload.get("commandId"), ack_ok)
        task_id = payload.get("taskId")
        if task_id:
            for task in robot_tasks_by_id.get(robot_id, []):
                if task.get("taskId") == task_id:
                    task["status"] = "ROBOT_ACK" if ack_ok else "FAILED"
                    task["robotAckStatus"] = status
                    task["acknowledgedAt"] = ack["timestamp"]
                    break
            try:
                from wms import store as wms_store
                ack["wms"] = wms_store.handle_robot_ack(
                    task_id=task_id,
                    robot_id=robot_id,
                    status=status,
                    actual_location_id=payload.get("actualLocationId"),
                    allow_complete_without_photo=bool(payload.get("allowCompleteWithoutPhoto", False)),
                )
            except HTTPException:
                raise
            except Exception as exc:
                ack["wmsWarning"] = f"Không cập nhật được WMS từ ACK: {exc}"
        if command is not None:
            ack["command"] = command
        ws_extra = {key: value for key, value in ack.items() if key not in {"event", "robotId", "timestamp"}}
        await robot_manager.broadcast(make_robot_ws_payload("ROBOT_ACK", robot_id, ack, **ws_extra))
        return ack

    @app.websocket("/ws/robot")
    async def robot_websocket(websocket: WebSocket) -> None:
        """WebSocket endpoint for robot updates."""
        await robot_manager.connect(websocket)
        try:
            await websocket.send_json({
                "event": "ROBOT_SNAPSHOT",
                "type": "robot_snapshot",
                "timestamp": now_ms(),
                "data": latest_robot_telemetry_by_id,
                "robots": [enrich_robot(robot) for robot in registered_robots.values()],
                "telemetry": latest_robot_telemetry_by_id,
                "traffic": traffic_state,
            })
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            robot_manager.disconnect(websocket)
        except Exception:
            robot_manager.disconnect(websocket)
            await asyncio.sleep(0)
