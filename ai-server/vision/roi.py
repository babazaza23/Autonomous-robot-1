"""ROI (Region of Interest) validation for path and obstacles."""

from typing import Any

from config import (
    PATH_ROI_ENABLED,
    ROI_X_MIN,
    ROI_X_MAX,
    ROI_Y_MIN,
    STOP_ROI_X_MIN,
    STOP_ROI_X_MAX,
    STOP_ROI_Y_MIN,
    STOP_ROI_Y_MAX,
    STOP_ROI_MIN_OVERLAP_RATIO,
    WATCH_ROI_X_MIN,
    WATCH_ROI_X_MAX,
    WATCH_ROI_Y_MIN,
    WATCH_ROI_Y_MAX,
    WATCH_ROI_MIN_OVERLAP_RATIO,
    OPENCV_MIN_AREA_RATIO,
    OPENCV_MAX_AREA_RATIO,
    FULL_FRAME_COVERAGE_RATIO,
    WIDE_FRAME_WIDTH_RATIO,
    TALL_FRAME_HEIGHT_RATIO,
    SMALL_OBSTACLE_MIN_AREA_RATIO,
    REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE,
)
from utils import get_vision_session


def path_roi_config() -> dict[str, Any]:
    """Get path ROI configuration."""
    return {
        "enabled": PATH_ROI_ENABLED,
        "stopRoi": {
            "xMin": STOP_ROI_X_MIN,
            "xMax": STOP_ROI_X_MAX,
            "yMin": STOP_ROI_Y_MIN,
            "yMax": STOP_ROI_Y_MAX,
            "minOverlapRatio": STOP_ROI_MIN_OVERLAP_RATIO,
        },
        "watchRoi": {
            "xMin": WATCH_ROI_X_MIN,
            "xMax": WATCH_ROI_X_MAX,
            "yMin": WATCH_ROI_Y_MIN,
            "yMax": WATCH_ROI_Y_MAX,
            "minOverlapRatio": WATCH_ROI_MIN_OVERLAP_RATIO,
        },
    }


def get_roi_rect(
    image_width: int,
    image_height: int,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
) -> dict:
    """Calculate ROI rectangle in pixel coordinates."""
    return {
        "x": round(float(image_width * x_min), 2),
        "y": round(float(image_height * y_min), 2),
        "w": round(float(image_width * (x_max - x_min)), 2),
        "h": round(float(image_height * (y_max - y_min)), 2),
    }


def bbox_overlap_ratio(bbox: dict, roi: dict) -> float:
    """Calculate the overlap ratio between a bbox and a ROI."""
    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return 0.0

    x = float(bbox["x"])
    y = float(bbox["y"])
    w = float(bbox["w"])
    h = float(bbox["h"])
    if w <= 0 or h <= 0:
        return 0.0

    inter_x1 = max(x, float(roi["x"]))
    inter_y1 = max(y, float(roi["y"]))
    inter_x2 = min(x + w, float(roi["x"]) + float(roi["w"]))
    inter_y2 = min(y + h, float(roi["y"]) + float(roi["h"]))
    intersection_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)
    return round(float(intersection_area / max(w * h, 1.0)), 4)


def center_in_roi(cx: float, cy: float, roi: dict) -> bool:
    """Check if a center point is inside a ROI."""
    return (
        float(roi["x"]) <= cx <= float(roi["x"]) + float(roi["w"])
        and float(roi["y"]) <= cy <= float(roi["y"]) + float(roi["h"])
    )


def path_zone_result(
    valid: bool,
    reason: str,
    stop_roi: dict,
    watch_roi: dict,
    stop_roi_passed: bool = False,
    watch_roi_passed: bool = False,
    center_in_stop_roi: bool = False,
    center_in_watch_roi: bool = False,
    stop_overlap_ratio: float = 0.0,
    watch_overlap_ratio: float = 0.0,
    blocking_path: bool = False,
    monitor_only: bool = False,
) -> dict:
    """Create a path zone validation result."""
    return {
        "valid": valid,
        "reason": reason,
        "stopRoiPassed": stop_roi_passed,
        "watchRoiPassed": watch_roi_passed,
        "centerInStopRoi": center_in_stop_roi,
        "centerInWatchRoi": center_in_watch_roi,
        "stopOverlapRatio": round(float(stop_overlap_ratio), 4),
        "watchOverlapRatio": round(float(watch_overlap_ratio), 4),
        "blockingPath": blocking_path,
        "monitorOnly": monitor_only,
        "stopRoi": stop_roi,
        "watchRoi": watch_roi,
    }


def validate_path_zones(
    bbox: dict,
    image_width: int,
    image_height: int,
) -> dict:
    """Validate bbox against STOP and WATCH ROIs."""
    stop_roi = get_roi_rect(image_width, image_height, STOP_ROI_X_MIN, STOP_ROI_X_MAX, STOP_ROI_Y_MIN, STOP_ROI_Y_MAX)
    watch_roi = get_roi_rect(
        image_width,
        image_height,
        WATCH_ROI_X_MIN,
        WATCH_ROI_X_MAX,
        WATCH_ROI_Y_MIN,
        WATCH_ROI_Y_MAX,
    )

    if not PATH_ROI_ENABLED:
        return path_zone_result(
            True,
            "path_roi_disabled",
            stop_roi,
            watch_roi,
            stop_roi_passed=True,
            watch_roi_passed=True,
            center_in_stop_roi=True,
            center_in_watch_roi=True,
            stop_overlap_ratio=1.0,
            watch_overlap_ratio=1.0,
            blocking_path=True,
        )

    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return path_zone_result(False, "invalid_bbox", stop_roi, watch_roi)

    x = float(bbox["x"])
    y = float(bbox["y"])
    w = float(bbox["w"])
    h = float(bbox["h"])
    if w <= 0 or h <= 0:
        return path_zone_result(False, "invalid_size", stop_roi, watch_roi)

    cx = x + w / 2
    cy = y + h / 2
    center_in_stop = center_in_roi(cx, cy, stop_roi)
    center_in_watch = center_in_roi(cx, cy, watch_roi)
    stop_overlap = bbox_overlap_ratio(bbox, stop_roi)
    watch_overlap = bbox_overlap_ratio(bbox, watch_roi)
    stop_passed = center_in_stop or stop_overlap >= STOP_ROI_MIN_OVERLAP_RATIO
    watch_passed = center_in_watch or watch_overlap >= WATCH_ROI_MIN_OVERLAP_RATIO

    if stop_passed:
        return path_zone_result(
            True,
            "inside_stop_roi",
            stop_roi,
            watch_roi,
            stop_roi_passed=True,
            watch_roi_passed=True,
            center_in_stop_roi=center_in_stop,
            center_in_watch_roi=center_in_watch,
            stop_overlap_ratio=stop_overlap,
            watch_overlap_ratio=watch_overlap,
            blocking_path=True,
            monitor_only=False,
        )

    if watch_passed:
        return path_zone_result(
            True,
            "inside_watch_roi",
            stop_roi,
            watch_roi,
            stop_roi_passed=False,
            watch_roi_passed=True,
            center_in_stop_roi=center_in_stop,
            center_in_watch_roi=center_in_watch,
            stop_overlap_ratio=stop_overlap,
            watch_overlap_ratio=watch_overlap,
            blocking_path=False,
            monitor_only=True,
        )

    return path_zone_result(
        False,
        "outside_path_roi",
        stop_roi,
        watch_roi,
        center_in_stop_roi=center_in_stop,
        center_in_watch_roi=center_in_watch,
        stop_overlap_ratio=stop_overlap,
        watch_overlap_ratio=watch_overlap,
    )


def validate_path_roi(
    bbox: dict,
    image_width: int,
    image_height: int,
) -> dict:
    """Validate bbox against STOP ROI for path checking."""
    zones = validate_path_zones(bbox, image_width, image_height)
    return {
        "valid": zones["valid"],
        "reason": zones["reason"],
        "centerPassed": zones["centerInStopRoi"],
        "overlapRatio": zones["stopOverlapRatio"],
        "roi": zones["stopRoi"],
    }


def validate_obstacle_bbox(
    bbox: dict[str, int],
    image_width: int,
    image_height: int,
    area_ratio: float,
    source: str,
    background_calibrated: bool,
) -> dict[str, Any]:
    """Validate an OpenCV obstacle bbox against size, frame-shape, and STOP/WATCH ROI."""
    zones = validate_path_zones(bbox, image_width, image_height)

    def result(valid: bool, reason: str, roi_passed: bool, full_frame_like: bool) -> dict[str, Any]:
        return {
            "valid": valid,
            "reason": reason,
            "roiPassed": roi_passed,
            "fullFrameLike": full_frame_like,
            "stopRoiPassed": zones["stopRoiPassed"],
            "watchRoiPassed": zones["watchRoiPassed"],
            "centerInStopRoi": zones["centerInStopRoi"],
            "centerInWatchRoi": zones["centerInWatchRoi"],
            "stopOverlapRatio": zones["stopOverlapRatio"],
            "watchOverlapRatio": zones["watchOverlapRatio"],
            "blockingPath": zones["blockingPath"],
            "monitorOnly": zones["monitorOnly"],
            "stopRoi": zones["stopRoi"],
            "watchRoi": zones["watchRoi"],
        }

    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return result(False, "invalid_bbox", False, False)

    x = int(bbox["x"])
    y = int(bbox["y"])
    w = int(bbox["w"])
    h = int(bbox["h"])

    if w <= 0 or h <= 0:
        return result(False, "invalid_size", False, False)

    if (
        x <= 5
        and y <= 5
        and w >= image_width * FULL_FRAME_COVERAGE_RATIO
        and h >= image_height * FULL_FRAME_COVERAGE_RATIO
    ):
        return result(False, "full_frame", False, True)

    if area_ratio > OPENCV_MAX_AREA_RATIO:
        return result(False, "too_large", False, True)

    if w >= image_width * WIDE_FRAME_WIDTH_RATIO and h >= image_height * TALL_FRAME_HEIGHT_RATIO:
        return result(False, "background_like_large_region", False, True)

    if x <= 5 and x + w >= image_width - 5:
        return result(False, "touches_left_and_right_edges", False, True)

    if y <= 5 and y + h >= image_height - 5:
        return result(False, "touches_top_and_bottom_edges", False, True)

    if not zones["valid"]:
        return result(False, zones["reason"], False, False)

    if area_ratio < OPENCV_MIN_AREA_RATIO:
        if not (zones["blockingPath"] and area_ratio >= SMALL_OBSTACLE_MIN_AREA_RATIO):
            return result(False, "too_small", zones["valid"], False)

    if source == "opencv_static" and REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE and not background_calibrated:
        return result(False, "background_not_calibrated", zones["valid"], False)

    return result(True, "ok", zones["valid"], False)
