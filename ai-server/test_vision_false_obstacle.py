"""
Test suite for validate_obstacle_bbox and validate_path_roi logic.

Run:
    cd ai-server
    python test_vision_false_obstacle.py
"""
import sys

OPENCV_MIN_AREA_RATIO = 0.03
OPENCV_MAX_AREA_RATIO = 0.45
FULL_FRAME_COVERAGE_RATIO = 0.85
WIDE_FRAME_WIDTH_RATIO = 0.85
TALL_FRAME_HEIGHT_RATIO = 0.70
ROI_X_MIN = 0.15
ROI_X_MAX = 0.85
ROI_Y_MIN = 0.35
PATH_ROI_ENABLED = True
PATH_ROI_X_MIN = 0.30
PATH_ROI_X_MAX = 0.70
PATH_ROI_Y_MIN = 0.45
PATH_ROI_Y_MAX = 1.00
PATH_ROI_MIN_CENTER_REQUIRED = True
PATH_ROI_MIN_OVERLAP_RATIO = 0.25
REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE = True


def validate_path_roi(bbox, image_width, image_height):
    roi_x = image_width * PATH_ROI_X_MIN
    roi_y = image_height * PATH_ROI_Y_MIN
    roi_w = image_width * (PATH_ROI_X_MAX - PATH_ROI_X_MIN)
    roi_h = image_height * (PATH_ROI_Y_MAX - PATH_ROI_Y_MIN)
    roi = {
        "x": round(float(roi_x), 2),
        "y": round(float(roi_y), 2),
        "w": round(float(roi_w), 2),
        "h": round(float(roi_h), 2),
    }

    if not PATH_ROI_ENABLED:
        return {
            "valid": True,
            "reason": "path_roi_disabled",
            "centerPassed": True,
            "overlapRatio": 1.0,
            "roi": roi,
        }

    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return {
            "valid": False,
            "reason": "invalid_bbox",
            "centerPassed": False,
            "overlapRatio": 0.0,
            "roi": roi,
        }

    x, y, w, h = float(bbox["x"]), float(bbox["y"]), float(bbox["w"]), float(bbox["h"])
    if w <= 0 or h <= 0:
        return {
            "valid": False,
            "reason": "invalid_size",
            "centerPassed": False,
            "overlapRatio": 0.0,
            "roi": roi,
        }

    cx, cy = x + w / 2, y + h / 2
    center_passed = roi_x <= cx <= roi_x + roi_w and roi_y <= cy <= roi_y + roi_h

    inter_x1 = max(x, roi_x)
    inter_y1 = max(y, roi_y)
    inter_x2 = min(x + w, roi_x + roi_w)
    inter_y2 = min(y + h, roi_y + roi_h)
    intersection_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)
    overlap_ratio = intersection_area / max(w * h, 1.0)

    if center_passed:
        return {
            "valid": True,
            "reason": "center_in_path_roi",
            "centerPassed": True,
            "overlapRatio": round(float(overlap_ratio), 4),
            "roi": roi,
        }

    if overlap_ratio >= PATH_ROI_MIN_OVERLAP_RATIO:
        return {
            "valid": True,
            "reason": "overlap_path_roi",
            "centerPassed": False,
            "overlapRatio": round(float(overlap_ratio), 4),
            "roi": roi,
        }

    return {
        "valid": False,
        "reason": "outside_path_roi",
        "centerPassed": False,
        "overlapRatio": round(float(overlap_ratio), 4),
        "roi": roi,
    }


def validate_obstacle_bbox(bbox, image_width, image_height, area_ratio, source, background_calibrated):
    if not all(k in bbox for k in ("x", "y", "w", "h")):
        return {"valid": False, "reason": "invalid_bbox", "roiPassed": False, "fullFrameLike": False}
    x, y, w, h = int(bbox["x"]), int(bbox["y"]), int(bbox["w"]), int(bbox["h"])
    if w <= 0 or h <= 0:
        return {"valid": False, "reason": "invalid_size", "roiPassed": False, "fullFrameLike": False}
    if area_ratio < OPENCV_MIN_AREA_RATIO:
        return {"valid": False, "reason": "too_small", "roiPassed": False, "fullFrameLike": False}
    if area_ratio > OPENCV_MAX_AREA_RATIO:
        return {"valid": False, "reason": "too_large", "roiPassed": False, "fullFrameLike": True}
    if x <= 5 and y <= 5 and w >= image_width * FULL_FRAME_COVERAGE_RATIO and h >= image_height * FULL_FRAME_COVERAGE_RATIO:
        return {"valid": False, "reason": "full_frame", "roiPassed": False, "fullFrameLike": True}
    if w >= image_width * WIDE_FRAME_WIDTH_RATIO and h >= image_height * TALL_FRAME_HEIGHT_RATIO:
        return {"valid": False, "reason": "background_like_large_region", "roiPassed": False, "fullFrameLike": True}
    if x <= 5 and x + w >= image_width - 5:
        return {"valid": False, "reason": "touches_left_and_right_edges", "roiPassed": False, "fullFrameLike": True}
    if y <= 5 and y + h >= image_height - 5:
        return {"valid": False, "reason": "touches_top_and_bottom_edges", "roiPassed": False, "fullFrameLike": True}

    cx, cy = x + w / 2, y + h / 2
    in_h_roi = image_width * ROI_X_MIN <= cx <= image_width * ROI_X_MAX
    in_v_roi = cy >= image_height * ROI_Y_MIN
    if not (in_h_roi and in_v_roi):
        return {"valid": False, "reason": "outside_forward_roi", "roiPassed": False, "fullFrameLike": False}

    path_validation = validate_path_roi(bbox, image_width, image_height)
    if not path_validation["valid"]:
        return {
            "valid": False,
            "reason": path_validation["reason"],
            "roiPassed": True,
            "fullFrameLike": False,
            "pathRoiPassed": False,
            "pathOverlapRatio": path_validation["overlapRatio"],
        }

    if source == "opencv_static" and REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE and not background_calibrated:
        return {
            "valid": False,
            "reason": "background_not_calibrated",
            "roiPassed": True,
            "fullFrameLike": False,
            "pathRoiPassed": True,
            "pathOverlapRatio": path_validation["overlapRatio"],
        }

    return {
        "valid": True,
        "reason": "ok",
        "roiPassed": True,
        "fullFrameLike": False,
        "pathRoiPassed": True,
        "pathOverlapRatio": path_validation["overlapRatio"],
    }


results = []


def run_test(name, bbox, iw, ih, area_ratio, source, bg_cal, expect_valid):
    result = validate_obstacle_bbox(bbox, iw, ih, area_ratio, source, bg_cal)
    ok = result["valid"] == expect_valid
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if not ok:
        print(f"         expected valid={expect_valid}, got valid={result['valid']}, reason={result['reason']}")
    results.append(ok)


def run_path_roi_test(name, bbox, iw, ih, expect_valid, expect_center=None):
    result = validate_path_roi(bbox, iw, ih)
    ok = result["valid"] == expect_valid
    if expect_center is not None:
        ok = ok and result["centerPassed"] == expect_center
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if not ok:
        print(
            "         expected "
            f"valid={expect_valid}, center={expect_center}; got "
            f"valid={result['valid']}, center={result['centerPassed']}, "
            f"reason={result['reason']}, overlap={result['overlapRatio']}"
        )
    results.append(ok)


print("\n=== validate_obstacle_bbox - WMS Robot Vision Tests ===\n")

run_test("Test 1: Full frame is rejected",
         {"x": 0, "y": 0, "w": 320, "h": 240}, 320, 240, 1.0, "opencv_static", True, False)

run_test("Test 2: Large background-like region is rejected",
         {"x": 5, "y": 5, "w": 279, "h": 192}, 320, 240, (279 * 192) / (320 * 240), "opencv_motion", False, False)

run_test("Test 3: opencv_static without calibration is rejected",
         {"x": 80, "y": 100, "w": 80, "h": 80}, 320, 240, (80 * 80) / (320 * 240), "opencv_static", False, False)

_ar4 = (100 * 80) / (320 * 240)
run_test(f"Test 4: Valid object in Path ROI, bg calibrated, area={_ar4:.3f} is accepted",
         {"x": 100, "y": 110, "w": 100, "h": 80}, 320, 240, _ar4, "opencv_static", True, True)

run_test("Test 5: Top-left corner, outside ROI is rejected",
         {"x": 5, "y": 5, "w": 80, "h": 60}, 320, 240, (80 * 60) / (320 * 240), "opencv_motion", False, False)

run_test("Test 6: Touches left and right edges is rejected",
         {"x": 0, "y": 80, "w": 320, "h": 60}, 320, 240, (320 * 60) / (320 * 240), "opencv_motion", False, False)

run_test("Test 7: Touches top and bottom edges is rejected",
         {"x": 80, "y": 0, "w": 60, "h": 240}, 320, 240, (60 * 240) / (320 * 240), "opencv_motion", False, False)

run_test("Test 8: OpenCV bbox inside forward ROI but left of Path ROI is rejected",
         {"x": 50, "y": 120, "w": 40, "h": 60}, 320, 240, (40 * 60) / (320 * 240), "opencv_motion", False, False)

print("\n=== validate_path_roi - Path ROI Tests ===\n")

run_path_roi_test("Path 1: Center/lower-half bbox passes",
                  {"x": 130, "y": 130, "w": 60, "h": 60}, 320, 240, True, True)

run_path_roi_test("Path 2: Left-side bbox outside lane fails",
                  {"x": 5, "y": 130, "w": 50, "h": 60}, 320, 240, False, False)

run_path_roi_test("Path 3: Right-side bbox outside lane fails",
                  {"x": 265, "y": 130, "w": 50, "h": 60}, 320, 240, False, False)

run_path_roi_test("Path 4: Upper-image bbox fails",
                  {"x": 130, "y": 35, "w": 60, "h": 60}, 320, 240, False, False)

run_path_roi_test("Path 5: Partial overlap above threshold passes",
                  {"x": 60, "y": 120, "w": 50, "h": 80}, 320, 240, True, False)

run_path_roi_test("Path 6: Partial overlap below threshold fails",
                  {"x": 70, "y": 120, "w": 30, "h": 80}, 320, 240, False, False)

passed = sum(results)
total = len(results)
print(f"\n=== Results: {passed}/{total} passed ===\n")
if passed < total:
    print("SOME TESTS FAILED\n")
    sys.exit(1)
else:
    print("All tests passed!\n")
