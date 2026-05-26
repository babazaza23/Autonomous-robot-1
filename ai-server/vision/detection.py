"""YOLO and OpenCV-based object detection."""

from typing import Any
from pathlib import Path

import cv2
import numpy as np

from config import (
    MODEL_NAME,
    PERSON_CONFIDENCE,
    YOLO_IMAGE_SIZE,
    SMALL_OBSTACLE_MIN_AREA_RATIO,
    OPENCV_MIN_AREA_RATIO,
    OPENCV_MAX_AREA_RATIO,
    FULL_FRAME_COVERAGE_RATIO,
    WIDE_FRAME_WIDTH_RATIO,
    TALL_FRAME_HEIGHT_RATIO,
    ROI_X_MIN,
    ROI_X_MAX,
    ROI_Y_MIN,
    MOVING_SPEED_THRESHOLD,
    FAST_MOVING_SPEED_THRESHOLD,
)
from vision.roi import validate_path_zones, validate_path_roi, validate_obstacle_bbox
from utils import clamp

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

# Global model cache
model: Any | None = None
model_error: str | None = None


def get_model() -> Any | None:
    """Load and cache YOLO model."""
    global model, model_error

    if model is not None:
        return model
    if model_error is not None:
        return None
    if YOLO is None:
        model_error = "ultralytics YOLO is not available"
        return None
    model_path = Path(MODEL_NAME)
    if not model_path.exists():
        model_error = f"YOLO model not found: {MODEL_NAME}. Set YOLO_MODEL_PATH or copy yolo11n.pt into ai-server."
        return None

    try:
        model = YOLO(MODEL_NAME)
        return model
    except Exception as exc:
        model_error = str(exc)
        return None


def create_detection(
    object_type: str,
    raw_label: str,
    confidence: float,
    bbox: dict[str, int],
    area_ratio: float,
    source: str,
    debug_source: str | None = None,
    background_calibrated: bool = False,
) -> dict[str, Any]:
    """Create a detection dict with standard structure."""
    label = "person" if object_type == "PERSON" else "obstacle"
    detailed_source = debug_source or source
    return {
        "type": "PERSON_MOVING" if object_type == "PERSON" else "OBSTACLE_STATIC",
        "objectType": object_type,
        "label": label,
        "rawLabel": raw_label,
        "confidence": round(float(confidence), 4),
        "bbox": bbox,
        "areaRatio": round(float(area_ratio), 4),
        "level": "CRITICAL" if object_type == "PERSON" else "HIGH",
        "motion": {
            "moving": False,
            "speedPxPerSec": 0,
            "dx": 0,
            "dy": 0,
            "direction": "new",
            "areaDeltaPerSec": 0,
        },
        "action": "EMERGENCY_STOP" if object_type == "PERSON" else "STOP_AND_SCAN",
        "turnAngle": None,
        "turnDirection": None,
        "recheckAfterMs": None,
        "message": "",
        "source": source,
        "debug": {
            "source": detailed_source,
            "validBbox": True,
            "areaRatio": round(float(area_ratio), 4),
            "roiPassed": True,
            "stopRoiPassed": True,
            "watchRoiPassed": True,
            "centerInStopRoi": True,
            "centerInWatchRoi": True,
            "stopOverlapRatio": 1.0,
            "watchOverlapRatio": 1.0,
            "blockingPath": True,
            "monitorOnly": False,
            "backgroundCalibrated": background_calibrated,
        },
    }


def path_debug_fields(source: str, area_ratio: float, zones: dict[str, Any], background_calibrated: bool) -> dict[str, Any]:
    """Create debug fields for path ROI validation."""
    return {
        "source": source,
        "validBbox": True,
        "areaRatio": round(float(area_ratio), 4),
        "roiPassed": zones["valid"],
        "stopRoiPassed": zones["stopRoiPassed"],
        "watchRoiPassed": zones["watchRoiPassed"],
        "centerInStopRoi": zones["centerInStopRoi"],
        "centerInWatchRoi": zones["centerInWatchRoi"],
        "stopOverlapRatio": zones["stopOverlapRatio"],
        "watchOverlapRatio": zones["watchOverlapRatio"],
        "blockingPath": zones["blockingPath"],
        "monitorOnly": zones["monitorOnly"],
        "backgroundCalibrated": background_calibrated,
    }


def detect_people_by_yolo(image: np.ndarray, session: Any) -> list[dict[str, Any]]:
    """Detect people using YOLO model."""
    yolo_model = get_model()
    if yolo_model is None:
        return []

    height, width = image.shape[:2]
    image_area = max(width * height, 1)
    detections: list[dict[str, Any]] = []

    try:
        predictions = yolo_model.predict(image, imgsz=YOLO_IMAGE_SIZE, conf=PERSON_CONFIDENCE, verbose=False)
    except Exception:
        return []

    for prediction in predictions:
        class_names = prediction.names or {}
        boxes = getattr(prediction, "boxes", None)
        if boxes is None:
            continue

        for box in boxes:
            try:
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
            except Exception:
                continue

            raw_label = str(class_names.get(class_id, f"class_{class_id}"))
            if raw_label != "person":
                continue

            bbox = {
                "x": max(0, int(round(x1))),
                "y": max(0, int(round(y1))),
                "w": max(0, int(round(x2 - x1))),
                "h": max(0, int(round(y2 - y1))),
            }
            area_ratio = (bbox["w"] * bbox["h"]) / image_area
            zones = validate_path_zones(bbox, width, height)
            if not zones["valid"]:
                print(
                    f"Rejected YOLO person: reason={zones['reason']}, "
                    f"bbox={bbox}, watchOverlap={zones['watchOverlapRatio']:.4f}"
                )
                continue

            background_calibrated = session.background_gray_frame is not None
            detection = create_detection("PERSON", raw_label, confidence, bbox, area_ratio, "yolo", background_calibrated=background_calibrated)
            detection["debug"].update(path_debug_fields("yolo", area_ratio, zones, background_calibrated))
            if zones["blockingPath"]:
                detection["type"] = "PERSON_MOVING"
                detection["level"] = "CRITICAL"
                detection["action"] = "EMERGENCY_STOP"
                detection["recheckAfterMs"] = None
                detection["message"] = "Phát hiện người trong vùng di chuyển phía trước robot. Robot dừng khẩn cấp."
            else:
                detection["type"] = "PERSON_NEAR_PATH"
                detection["level"] = "MEDIUM"
                detection["action"] = "SLOW_DOWN_AND_MONITOR"
                detection["recheckAfterMs"] = 800
                detection["message"] = "Phát hiện người gần vùng di chuyển. Robot giảm tốc và theo dõi."
            detections.append(detection)

    return detections


def background_difference_candidates(gray: np.ndarray, image_shape: tuple[int, int, int], session: Any) -> list[dict[str, Any]]:
    """Detect static obstacles by comparing with background."""
    height, width = image_shape[:2]
    image_area = max(width * height, 1)

    if session.background_gray_frame is None or session.background_gray_frame.shape != gray.shape:
        return []

    diff = cv2.absdiff(gray, session.background_gray_frame)
    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    _, mask = cv2.threshold(diff, 42, 255, cv2.THRESH_BINARY)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[dict[str, Any]] = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < 24 or h < 24:
            continue

        bbox = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
        bbox_area_ratio = (w * h) / image_area
        contour_area_ratio = cv2.contourArea(contour) / image_area
        if bbox_area_ratio < SMALL_OBSTACLE_MIN_AREA_RATIO and contour_area_ratio < SMALL_OBSTACLE_MIN_AREA_RATIO * 0.6:
            continue

        roi = diff[y : y + h, x : x + w]
        mean_difference = float(np.mean(roi)) if roi.size else 0.0
        changed_ratio = float(np.count_nonzero(mask[y : y + h, x : x + w])) / max(w * h, 1)
        if mean_difference < 18.0 or changed_ratio < 0.18:
            continue

        candidates.append(
            {
                "bbox": bbox,
                "areaRatio": bbox_area_ratio,
                "score": bbox_area_ratio + contour_area_ratio + changed_ratio + 0.08,
                "reason": "background_diff",
                "meanDifference": mean_difference,
                "changedRatio": changed_ratio,
            }
        )

    return merge_candidate_boxes(candidates, width, height, "opencv_static", session)


def frame_difference_candidates(gray: np.ndarray, image_shape: tuple[int, int, int], session: Any) -> list[dict[str, Any]]:
    """Detect moving obstacles by comparing consecutive frames."""
    height, width = image_shape[:2]
    image_area = max(width * height, 1)

    if session.previous_gray_frame is None or session.previous_gray_frame.shape != gray.shape:
        session.previous_gray_frame = gray.copy()
        return []

    diff = cv2.absdiff(gray, session.previous_gray_frame)
    session.previous_gray_frame = gray.copy()

    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    _, diff_mask = cv2.threshold(diff, 35, 255, cv2.THRESH_BINARY)
    kernel = np.ones((5, 5), np.uint8)
    diff_mask = cv2.morphologyEx(diff_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    diff_mask = cv2.morphologyEx(diff_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(diff_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[dict[str, Any]] = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < 24 or h < 24:
            continue

        bbox = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
        area_ratio = (w * h) / image_area
        if area_ratio < SMALL_OBSTACLE_MIN_AREA_RATIO:
            continue

        motion_mask_roi = diff_mask[y : y + h, x : x + w]
        changed_ratio = float(np.count_nonzero(motion_mask_roi)) / max(w * h, 1)
        if changed_ratio < 0.20:
            continue

        candidates.append(
            {
                "bbox": bbox,
                "areaRatio": area_ratio,
                "score": area_ratio + changed_ratio + 0.05,
                "reason": "frame_diff",
                "changedRatio": changed_ratio,
            }
        )

    return merge_candidate_boxes(candidates, width, height, "opencv_motion", session)


def merge_candidate_boxes(candidates: list[dict[str, Any]], width: int, height: int, source: str, session: Any) -> list[dict[str, Any]]:
    """Filter and sort obstacle candidates."""
    valid: list[dict[str, Any]] = []
    for candidate in candidates:
        bbox = candidate["bbox"]
        area_ratio = float(candidate["areaRatio"])
        validation = validate_obstacle_bbox(
            bbox,
            width,
            height,
            area_ratio,
            source,
            background_calibrated=session.background_gray_frame is not None,
        )
        if validation["valid"]:
            candidate["validation"] = validation
            candidate["sourceDetail"] = source
            valid.append(candidate)

    valid.sort(key=lambda item: float(item.get("score", item.get("areaRatio", 0))), reverse=True)
    return valid


def detect_obstacle_by_opencv(image: np.ndarray, session: Any, allow_static_without_background: bool = False) -> dict[str, Any] | None:
    """Detect obstacles using OpenCV (frame and background difference)."""
    height, width = image.shape[:2]
    image_area = max(width * height, 1)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    candidates: list[dict[str, Any]] = []

    moving_candidates = frame_difference_candidates(gray, image.shape, session)
    candidates.extend(moving_candidates)

    if session.background_gray_frame is not None:
        candidates.extend(background_difference_candidates(gray, image.shape, session))
    elif allow_static_without_background:
        pass

    if not candidates:
        return None

    best = max(candidates, key=lambda item: float(item.get("score", 0)))
    bbox = best["bbox"]
    area_ratio = (bbox["w"] * bbox["h"]) / image_area

    source_detail: str
    if best.get("reason") == "background_diff":
        source_detail = "opencv_static"
    else:
        source_detail = "opencv_motion"

    validation = validate_obstacle_bbox(
        bbox=bbox,
        image_width=width,
        image_height=height,
        area_ratio=area_ratio,
        source=source_detail,
        background_calibrated=session.background_gray_frame is not None,
    )
    if not validation["valid"]:
        return None

    if source_detail == "opencv_static":
        raw_label = "opencv_static_obstacle"
        source = "opencv_static"
    else:
        raw_label = "opencv_motion_obstacle"
        source = "opencv_motion"

    confidence = clamp(0.42 + area_ratio * 1.5, 0.42, 0.86)
    detection = create_detection(
        "OBSTACLE",
        raw_label,
        confidence,
        bbox,
        area_ratio,
        source,
        source_detail,
        background_calibrated=session.background_gray_frame is not None,
    )
    detection["opencvReason"] = best.get("reason")
    detection["sourceDetail"] = source_detail
    detection["debug"].update({
        "source": source_detail,
        "validBbox": True,
        "areaRatio": round(float(area_ratio), 4),
        "roiPassed": validation["roiPassed"],
        "stopRoiPassed": validation["stopRoiPassed"],
        "watchRoiPassed": validation["watchRoiPassed"],
        "centerInStopRoi": validation["centerInStopRoi"],
        "centerInWatchRoi": validation["centerInWatchRoi"],
        "stopOverlapRatio": validation["stopOverlapRatio"],
        "watchOverlapRatio": validation["watchOverlapRatio"],
        "blockingPath": validation["blockingPath"],
        "monitorOnly": validation["monitorOnly"],
        "backgroundCalibrated": session.background_gray_frame is not None,
    })
    if source_detail == "opencv_motion":
        detection["motion"] = {
            "moving": True,
            "speedPxPerSec": max(MOVING_SPEED_THRESHOLD, 35.0),
            "dx": 0,
            "dy": 0,
            "direction": "motion",
            "areaDeltaPerSec": 0,
        }
    return detection
