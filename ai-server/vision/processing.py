"""High-level vision processing and event classification."""

from typing import Any

from config import (
    FAST_MOVING_SPEED_THRESHOLD,
    MOVING_SPEED_THRESHOLD,
    CLEAR_FRAME_REQUIRED,
    PERSON_CLEAR_FRAME_REQUIRED,
    MIN_TURN_ANGLE,
    MAX_TURN_ANGLE,
)
from vision.detection import detect_people_by_yolo, detect_obstacle_by_opencv
from utils import get_vision_session, normalize_robot_id, clamp


def empty_performance() -> dict[str, Any]:
    """Create empty performance metrics."""
    return {
        "processingTimeMs": 0,
        "frameWidth": None,
        "frameHeight": None,
    }


def empty_latency(timestamp: int) -> dict[str, Any]:
    """Create empty latency metrics."""
    return {
        "capturedAtMs": None,
        "serverReceivedAtMs": timestamp,
        "serverResultAtMs": timestamp,
        "captureToServerMs": None,
        "serverProcessingMs": 0,
        "captureToResultMs": None,
    }


def empty_result(robot_id: str, timestamp: int) -> dict[str, Any]:
    """Create empty detection result."""
    return {
        "timestamp": timestamp,
        "robotId": robot_id,
        "detected": False,
        "detections": [],
        "alert": None,
        "imageUrl": f"/api/latest-frame?robotId={robot_id}&t={timestamp}",
        "performance": empty_performance(),
        "latency": empty_latency(timestamp),
        "safetyState": {},
    }


def estimate_turn_action(bbox: dict[str, int], image_width: int) -> dict[str, Any]:
    """Estimate turn action for obstacle avoidance."""
    cx = bbox["x"] + bbox["w"] / 2
    image_center_x = image_width / 2
    offset = cx - image_center_x
    offset_norm = abs(offset) / max(image_center_x, 1)

    if offset_norm < 0.15:
        return {
            "action": "STOP_AND_SCAN",
            "turnAngle": None,
            "turnDirection": "CENTER",
            "message": "Vat can nam gan giua huong di. Robot dung va quet lai truoc khi di tiep.",
        }

    turn_angle = round(clamp(offset_norm * 30 + 10, MIN_TURN_ANGLE, MAX_TURN_ANGLE), 1)
    if offset < 0:
        return {
            "action": "TURN_RIGHT",
            "turnAngle": turn_angle,
            "turnDirection": "RIGHT",
            "message": f"Vat can lech trai. De xuat robot xoay phai {turn_angle:.1f} do.",
        }

    return {
        "action": "TURN_LEFT",
        "turnAngle": turn_angle,
        "turnDirection": "LEFT",
        "message": f"Vat can lech phai. De xuat robot xoay trai {turn_angle:.1f} do.",
    }


def classify_event_labels(detections: list[dict[str, Any]], image_width: int) -> list[dict[str, Any]]:
    """Classify detections into event labels and robot actions."""
    for detection in detections:
        object_type = detection["objectType"]
        motion = detection.get("motion", {})
        speed = float(motion.get("speedPxPerSec", 0))
        debug = detection.get("debug", {})
        blocking_path = bool(debug.get("blockingPath"))
        monitor_only = bool(debug.get("monitorOnly"))
        source = detection.get("sourceDetail") or detection.get("source")

        if object_type == "PERSON":
            detection["turnAngle"] = None
            detection["turnDirection"] = None
            if blocking_path:
                detection["type"] = "PERSON_MOVING"
                detection["level"] = "CRITICAL"
                detection["action"] = "EMERGENCY_STOP"
                detection["recheckAfterMs"] = None
                detection["message"] = "Phát hiện người trong vùng di chuyển phía trước robot. Robot dừng khẩn cấp."
            elif monitor_only:
                detection["type"] = "PERSON_NEAR_PATH"
                detection["level"] = "MEDIUM"
                detection["action"] = "SLOW_DOWN_AND_MONITOR"
                detection["recheckAfterMs"] = 800
                detection["message"] = "Phát hiện người gần vùng di chuyển. Robot giảm tốc và theo dõi."
            continue

        if source == "opencv_motion":
            detection["type"] = "OBSTACLE_MOVING"
            detection["turnAngle"] = None
            detection["turnDirection"] = None
            if blocking_path:
                detection["level"] = "HIGH"
                detection["action"] = "STOP_AND_RECHECK"
                detection["recheckAfterMs"] = 800 if speed >= FAST_MOVING_SPEED_THRESHOLD else 1000
                detection["message"] = "Vật cản di chuyển trong vùng đường đi. Robot dừng và kiểm tra lại."
            else:
                detection["level"] = "MEDIUM"
                detection["action"] = "SLOW_DOWN_AND_MONITOR"
                detection["recheckAfterMs"] = 800
                detection["message"] = "Vật cản di chuyển gần vùng đường đi. Robot giảm tốc và theo dõi."
            continue

        turn = estimate_turn_action(detection["bbox"], image_width)
        detection["type"] = "OBSTACLE_STATIC"
        if blocking_path:
            detection["level"] = "HIGH"
            detection["action"] = "STOP_AND_SCAN"
            detection["turnAngle"] = turn["turnAngle"]
            detection["turnDirection"] = turn["turnDirection"]
            detection["recheckAfterMs"] = None
            detection["message"] = "Vật cản đứng yên chắn vùng di chuyển. Robot dừng và quét hướng né."
        else:
            detection["level"] = "MEDIUM"
            detection["action"] = "SLOW_DOWN_AND_SCAN"
            detection["turnAngle"] = None
            detection["turnDirection"] = None
            detection["recheckAfterMs"] = 1000
            detection["message"] = "Vật cản đứng yên gần vùng di chuyển. Robot giảm tốc và kiểm tra."

    return detections


def create_alert(detections: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Create priority alert from detections."""
    if not detections:
        return None

    def priority(detection: dict[str, Any]) -> tuple[int, float]:
        event_type = detection.get("type")
        level = detection.get("level")
        if event_type == "PERSON_MOVING":
            rank = 0
        elif event_type == "OBSTACLE_MOVING" and level == "HIGH":
            rank = 1
        elif event_type == "OBSTACLE_STATIC" and level == "HIGH":
            rank = 2
        elif event_type == "PERSON_NEAR_PATH" and level == "MEDIUM":
            rank = 3
        elif event_type == "OBSTACLE_MOVING" and level == "MEDIUM":
            rank = 4
        elif event_type == "OBSTACLE_STATIC" and level == "MEDIUM":
            rank = 5
        else:
            rank = 99
        return (rank, -float(detection.get("confidence", 0)))

    detection = sorted(detections, key=priority)[0]
    return {
        "type": detection.get("type"),
        "level": detection.get("level"),
        "action": detection.get("action"),
        "turnAngle": detection.get("turnAngle"),
        "turnDirection": detection.get("turnDirection"),
        "recheckAfterMs": detection.get("recheckAfterMs"),
        "message": detection.get("message"),
    }


def safety_state_snapshot(session: Any, path_clear: bool | None = None) -> dict[str, Any]:
    """Create snapshot of safety state."""
    state = session.safety_state
    clear_count = int(state.get("clearFrameCount", 0))
    return {
        "suggestedRobotState": state.get("suggestedRobotState", "FOLLOW_LINE"),
        "clearFrameCount": clear_count,
        "lastBlockingType": state.get("lastBlockingType"),
        "pathClear": bool(path_clear) if path_clear is not None else clear_count > 0,
    }


def update_vision_safety_state(session: Any, detections: list[dict[str, Any]], timestamp: int) -> dict[str, Any]:
    """Update safety state based on detections."""
    vision_safety_state = session.safety_state
    blocking = [det for det in detections if bool((det.get("debug") or {}).get("blockingPath"))]
    medium_watch = [det for det in detections if bool((det.get("debug") or {}).get("monitorOnly"))]

    def has(event_type: str, level: str | None = None) -> bool:
        return any(
            det.get("type") == event_type and (level is None or det.get("level") == level)
            for det in blocking
        )

    if has("PERSON_MOVING", "CRITICAL"):
        vision_safety_state.update({
            "suggestedRobotState": "EMERGENCY_STOP_PERSON",
            "lastBlockingType": "PERSON_MOVING",
            "clearFrameCount": 0,
            "lastAlertAt": timestamp,
        })
        return safety_state_snapshot(session, path_clear=False)

    if has("OBSTACLE_MOVING", "HIGH"):
        vision_safety_state.update({
            "suggestedRobotState": "STOP_AND_RECHECK",
            "lastBlockingType": "OBSTACLE_MOVING",
            "clearFrameCount": 0,
            "lastAlertAt": timestamp,
        })
        return safety_state_snapshot(session, path_clear=False)

    if has("OBSTACLE_STATIC", "HIGH"):
        vision_safety_state.update({
            "suggestedRobotState": "STOP_AND_SCAN",
            "lastBlockingType": "OBSTACLE_STATIC",
            "clearFrameCount": 0,
            "lastAlertAt": timestamp,
        })
        return safety_state_snapshot(session, path_clear=False)

    if medium_watch:
        vision_safety_state.update({
            "suggestedRobotState": "SLOW_DOWN_AND_MONITOR",
            "clearFrameCount": 0,
        })
        return safety_state_snapshot(session, path_clear=False)

    previous_state = str(vision_safety_state.get("suggestedRobotState") or "FOLLOW_LINE")
    last_blocking_type = vision_safety_state.get("lastBlockingType")
    clear_count = int(vision_safety_state.get("clearFrameCount", 0)) + 1
    vision_safety_state["clearFrameCount"] = clear_count

    if last_blocking_type:
        required = PERSON_CLEAR_FRAME_REQUIRED if last_blocking_type == "PERSON_MOVING" else CLEAR_FRAME_REQUIRED
        if clear_count >= required:
            vision_safety_state.update({
                "suggestedRobotState": "RESUME_LINE",
                "lastBlockingType": None,
            })
        else:
            vision_safety_state["suggestedRobotState"] = "WAIT_CLEAR"
    elif previous_state == "RESUME_LINE":
        vision_safety_state["suggestedRobotState"] = "FOLLOW_LINE"
    else:
        vision_safety_state["suggestedRobotState"] = "FOLLOW_LINE"

    return safety_state_snapshot(session, path_clear=True)


def bbox_iou(a: dict[str, int], b: dict[str, int]) -> float:
    """Calculate Intersection over Union between two bboxes."""
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = max(a["w"] * a["h"], 1)
    area_b = max(b["w"] * b["h"], 1)
    return inter / max(area_a + area_b - inter, 1)


def overlaps_blocking_person(obstacle: dict[str, Any], people: list[dict[str, Any]]) -> bool:
    """Check if obstacle overlaps with any blocking person."""
    for person in people:
        if person.get("objectType") != "PERSON":
            continue
        debug = person.get("debug") or {}
        if not debug.get("blockingPath"):
            continue
        if bbox_iou(obstacle["bbox"], person["bbox"]) >= 0.35:
            return True
    return False


def detect_objects(image: Any, robot_id: str, timestamp: int) -> dict[str, Any]:
    """Main detection pipeline: YOLO + OpenCV + tracking + classification."""
    robot_id = normalize_robot_id(robot_id)
    session = get_vision_session(robot_id)
    result = empty_result(robot_id, timestamp)
    height, width = image.shape[:2]

    detections = detect_people_by_yolo(image, session)

    obstacle = detect_obstacle_by_opencv(image, session)
    if obstacle is not None:
        if not overlaps_blocking_person(obstacle, detections):
            detections.append(obstacle)

    detections = session.tracker.update(detections, timestamp)
    detections = classify_event_labels(detections, width)

    event_rank = {
        "PERSON_MOVING": 0,
        "OBSTACLE_MOVING": 1,
        "OBSTACLE_STATIC": 2,
        "PERSON_NEAR_PATH": 3,
    }
    level_rank = {
        "CRITICAL": 0,
        "HIGH": 1,
        "MEDIUM": 2,
    }
    detections.sort(
        key=lambda item: (
            event_rank.get(item.get("type", ""), 99),
            level_rank.get(item.get("level", ""), 99),
            -float(item.get("confidence", 0)),
        )
    )

    result["detections"] = detections
    result["detected"] = bool(detections)
    result["alert"] = create_alert(detections)
    result["safetyState"] = update_vision_safety_state(session, detections, timestamp)
    return result
