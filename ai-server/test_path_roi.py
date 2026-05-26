"""
Regression tests for STOP_ROI / WATCH_ROI obstacle validation.

Run:
    cd ai-server
    py test_path_roi.py
"""
import sys

PATH_ROI_ENABLED = True
STOP_ROI_X_MIN = 0.30
STOP_ROI_X_MAX = 0.70
STOP_ROI_Y_MIN = 0.45
STOP_ROI_Y_MAX = 1.00
STOP_ROI_MIN_OVERLAP_RATIO = 0.20
WATCH_ROI_X_MIN = 0.20
WATCH_ROI_X_MAX = 0.80
WATCH_ROI_Y_MIN = 0.35
WATCH_ROI_Y_MAX = 1.00
WATCH_ROI_MIN_OVERLAP_RATIO = 0.15
SMALL_OBSTACLE_MIN_AREA_RATIO = 0.008
OPENCV_MIN_AREA_RATIO = 0.03
OPENCV_MAX_AREA_RATIO = 0.45
FULL_FRAME_COVERAGE_RATIO = 0.85
WIDE_FRAME_WIDTH_RATIO = 0.85
TALL_FRAME_HEIGHT_RATIO = 0.70
REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE = True


def get_roi_rect(image_width, image_height, x_min, x_max, y_min, y_max):
    return {
        "x": round(float(image_width * x_min), 2),
        "y": round(float(image_height * y_min), 2),
        "w": round(float(image_width * (x_max - x_min)), 2),
        "h": round(float(image_height * (y_max - y_min)), 2),
    }


def bbox_overlap_ratio(bbox, roi):
    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return 0.0
    x, y, w, h = float(bbox["x"]), float(bbox["y"]), float(bbox["w"]), float(bbox["h"])
    if w <= 0 or h <= 0:
        return 0.0
    inter_x1 = max(x, float(roi["x"]))
    inter_y1 = max(y, float(roi["y"]))
    inter_x2 = min(x + w, float(roi["x"]) + float(roi["w"]))
    inter_y2 = min(y + h, float(roi["y"]) + float(roi["h"]))
    intersection_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)
    return round(float(intersection_area / max(w * h, 1.0)), 4)


def center_in_roi(cx, cy, roi):
    return float(roi["x"]) <= cx <= float(roi["x"]) + float(roi["w"]) and float(roi["y"]) <= cy <= float(roi["y"]) + float(roi["h"])


def path_zone_result(valid, reason, stop_roi, watch_roi, **kwargs):
    return {
        "valid": valid,
        "reason": reason,
        "stopRoiPassed": kwargs.get("stopRoiPassed", False),
        "watchRoiPassed": kwargs.get("watchRoiPassed", False),
        "centerInStopRoi": kwargs.get("centerInStopRoi", False),
        "centerInWatchRoi": kwargs.get("centerInWatchRoi", False),
        "stopOverlapRatio": round(float(kwargs.get("stopOverlapRatio", 0.0)), 4),
        "watchOverlapRatio": round(float(kwargs.get("watchOverlapRatio", 0.0)), 4),
        "blockingPath": kwargs.get("blockingPath", False),
        "monitorOnly": kwargs.get("monitorOnly", False),
        "stopRoi": stop_roi,
        "watchRoi": watch_roi,
    }


def validate_path_zones(bbox, image_width, image_height):
    stop_roi = get_roi_rect(image_width, image_height, STOP_ROI_X_MIN, STOP_ROI_X_MAX, STOP_ROI_Y_MIN, STOP_ROI_Y_MAX)
    watch_roi = get_roi_rect(image_width, image_height, WATCH_ROI_X_MIN, WATCH_ROI_X_MAX, WATCH_ROI_Y_MIN, WATCH_ROI_Y_MAX)

    if not PATH_ROI_ENABLED:
        return path_zone_result(True, "path_roi_disabled", stop_roi, watch_roi, stopRoiPassed=True, watchRoiPassed=True, blockingPath=True)
    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return path_zone_result(False, "invalid_bbox", stop_roi, watch_roi)

    x, y, w, h = float(bbox["x"]), float(bbox["y"]), float(bbox["w"]), float(bbox["h"])
    if w <= 0 or h <= 0:
        return path_zone_result(False, "invalid_size", stop_roi, watch_roi)

    cx, cy = x + w / 2, y + h / 2
    center_stop = center_in_roi(cx, cy, stop_roi)
    center_watch = center_in_roi(cx, cy, watch_roi)
    stop_overlap = bbox_overlap_ratio(bbox, stop_roi)
    watch_overlap = bbox_overlap_ratio(bbox, watch_roi)
    stop_passed = center_stop or stop_overlap >= STOP_ROI_MIN_OVERLAP_RATIO
    watch_passed = center_watch or watch_overlap >= WATCH_ROI_MIN_OVERLAP_RATIO

    if stop_passed:
        return path_zone_result(
            True, "inside_stop_roi", stop_roi, watch_roi,
            stopRoiPassed=True, watchRoiPassed=True,
            centerInStopRoi=center_stop, centerInWatchRoi=center_watch,
            stopOverlapRatio=stop_overlap, watchOverlapRatio=watch_overlap,
            blockingPath=True, monitorOnly=False,
        )
    if watch_passed:
        return path_zone_result(
            True, "inside_watch_roi", stop_roi, watch_roi,
            stopRoiPassed=False, watchRoiPassed=True,
            centerInStopRoi=center_stop, centerInWatchRoi=center_watch,
            stopOverlapRatio=stop_overlap, watchOverlapRatio=watch_overlap,
            blockingPath=False, monitorOnly=True,
        )
    return path_zone_result(
        False, "outside_path_roi", stop_roi, watch_roi,
        centerInStopRoi=center_stop, centerInWatchRoi=center_watch,
        stopOverlapRatio=stop_overlap, watchOverlapRatio=watch_overlap,
    )


def validate_obstacle_bbox(bbox, image_width, image_height, area_ratio, source, background_calibrated):
    zones = validate_path_zones(bbox, image_width, image_height)

    def result(valid, reason, roi_passed, full_frame_like):
        return {
            "valid": valid,
            "reason": reason,
            "roiPassed": roi_passed,
            "fullFrameLike": full_frame_like,
            **{k: zones[k] for k in (
                "stopRoiPassed", "watchRoiPassed", "centerInStopRoi", "centerInWatchRoi",
                "stopOverlapRatio", "watchOverlapRatio", "blockingPath", "monitorOnly",
                "stopRoi", "watchRoi",
            )},
        }

    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return result(False, "invalid_bbox", False, False)
    x, y, w, h = int(bbox["x"]), int(bbox["y"]), int(bbox["w"]), int(bbox["h"])
    if w <= 0 or h <= 0:
        return result(False, "invalid_size", False, False)
    if x <= 5 and y <= 5 and w >= image_width * FULL_FRAME_COVERAGE_RATIO and h >= image_height * FULL_FRAME_COVERAGE_RATIO:
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
    if area_ratio < OPENCV_MIN_AREA_RATIO and not (zones["blockingPath"] and area_ratio >= SMALL_OBSTACLE_MIN_AREA_RATIO):
        return result(False, "too_small", zones["valid"], False)
    if source == "opencv_static" and REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE and not background_calibrated:
        return result(False, "background_not_calibrated", zones["valid"], False)
    return result(True, "ok", zones["valid"], False)


results = []


def check(name, condition, detail=""):
    ok = bool(condition)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if not ok and detail:
        print(f"         {detail}")
    results.append(ok)


IW, IH = 320, 240

print("\n=== STOP_ROI / WATCH_ROI Tests ===\n")

zones = validate_path_zones({"x": 130, "y": 130, "w": 60, "h": 60}, IW, IH)
check("1. Center/lower bbox passes STOP_ROI", zones["valid"] and zones["blockingPath"] and zones["stopRoiPassed"], str(zones))

zones = validate_path_zones({"x": 65, "y": 100, "w": 40, "h": 60}, IW, IH)
check("2. WATCH_ROI-only bbox is monitorOnly", zones["valid"] and zones["monitorOnly"] and not zones["blockingPath"], str(zones))

zones = validate_path_zones({"x": 5, "y": 130, "w": 40, "h": 60}, IW, IH)
check("3. Outside WATCH_ROI fails", not zones["valid"] and zones["reason"] == "outside_path_roi", str(zones))

bbox = {"x": 145, "y": 135, "w": 28, "h": 24}
area = (bbox["w"] * bbox["h"]) / (IW * IH)
result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_motion", False)
check("4. Small bbox in STOP_ROI passes above small threshold", result["valid"], str(result))

bbox = {"x": 65, "y": 100, "w": 28, "h": 24}
area = (bbox["w"] * bbox["h"]) / (IW * IH)
result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_motion", False)
check("5. Small bbox outside STOP_ROI is rejected", not result["valid"] and result["reason"] == "too_small", str(result))

result = validate_obstacle_bbox({"x": 0, "y": 0, "w": 320, "h": 240}, IW, IH, 1.0, "opencv_static", True)
check("6. Full frame is rejected", not result["valid"] and result["reason"] == "full_frame", str(result))

bbox = {"x": 20, "y": 30, "w": 260, "h": 170}
area = (bbox["w"] * bbox["h"]) / (IW * IH)
result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_motion", False)
check("7. Too-large bbox is rejected", not result["valid"] and result["reason"] == "too_large", str(result))

bbox = {"x": 120, "y": 130, "w": 80, "h": 70}
area = (bbox["w"] * bbox["h"]) / (IW * IH)
result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_static", False)
check("8. Static obstacle without calibration is rejected", not result["valid"] and result["reason"] == "background_not_calibrated", str(result))

result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_motion", False)
check("9. opencv_motion in STOP_ROI passes", result["valid"] and result["blockingPath"], str(result))

bbox = {"x": 275, "y": 130, "w": 35, "h": 70}
area = (bbox["w"] * bbox["h"]) / (IW * IH)
result = validate_obstacle_bbox(bbox, IW, IH, area, "opencv_motion", False)
check("10. opencv_motion outside WATCH_ROI rejects", not result["valid"] and result["reason"] == "outside_path_roi", str(result))

passed = sum(results)
total = len(results)
print(f"\n=== Results: {passed}/{total} passed ===\n")
if passed < total:
    sys.exit(1)
