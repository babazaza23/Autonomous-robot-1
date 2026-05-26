import argparse
import csv
import json
import statistics
import time
from pathlib import Path
from typing import Any

import requests


DEFAULT_SERVER = "http://127.0.0.1:8000"
DEFAULT_ROBOT_ID = "robot-01"
SCENARIOS = ("background", "person", "static", "moving")


def post_image(server: str, image_path: Path, robot_id: str, timeout: float) -> tuple[dict[str, Any], float]:
    captured_at_ms = int(time.time() * 1000)
    request_start = time.perf_counter()
    with image_path.open("rb") as f:
        files = {"file": (image_path.name, f, "image/jpeg")}
        data = {"robotId": robot_id, "capturedAtMs": str(captured_at_ms)}
        response = requests.post(f"{server}/api/frame", files=files, data=data, params={"robotId": robot_id}, timeout=timeout)
    roundtrip_ms = (time.perf_counter() - request_start) * 1000
    response.raise_for_status()
    return response.json(), round(roundtrip_ms, 2)


def clear_background(server: str, robot_id: str, timeout: float) -> None:
    response = requests.post(f"{server}/api/vision/clear-background", params={"robotId": robot_id}, timeout=timeout)
    response.raise_for_status()


def calibrate_background(server: str, bg_path: Path, robot_id: str, timeout: float) -> None:
    clear_background(server, robot_id, timeout)
    post_image(server, bg_path, robot_id, timeout)
    response = requests.post(f"{server}/api/vision/calibrate-background", params={"robotId": robot_id}, timeout=timeout)
    response.raise_for_status()


def has_detection_type(result: dict[str, Any], expected_type: str) -> bool:
    return any(det.get("type") == expected_type for det in result.get("detections", []) or [])


def has_obstacle_false_positive(result: dict[str, Any]) -> bool:
    detections = result.get("detections") or []
    return any(det.get("objectType") == "OBSTACLE" for det in detections)


def metric_value(result: dict[str, Any], group: str, key: str) -> float | None:
    value = (result.get(group) or {}).get(key)
    return float(value) if isinstance(value, (int, float)) else None


def summarize(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "avg": None, "min": None, "max": None, "median": None}
    return {
        "count": len(values),
        "avg": round(statistics.mean(values), 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "median": round(statistics.median(values), 2),
    }


def pct(correct: int, total: int) -> float:
    return round(correct * 100 / total, 2) if total else 0.0


def load_manifest(dataset: Path) -> list[dict[str, str]]:
    manifest_path = dataset / "ground_truth.csv"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Khong tim thay manifest: {manifest_path}")
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def selected_rows(rows: list[dict[str, str]], scenario: str, limit: int | None) -> list[dict[str, str]]:
    allowed = set(SCENARIOS if scenario == "all" else [scenario])
    filtered = [row for row in rows if (row.get("scenario") or "").strip().lower() in allowed]
    if limit is not None:
        by_scenario: dict[str, list[dict[str, str]]] = {}
        for row in filtered:
            by_scenario.setdefault((row.get("scenario") or "").strip().lower(), []).append(row)
        limited: list[dict[str, str]] = []
        for name in SCENARIOS:
            limited.extend(by_scenario.get(name, [])[:limit])
        return limited
    return filtered


def main() -> None:
    parser = argparse.ArgumentParser(description="Danh gia metric AI Vision Server.")
    parser.add_argument("--server", default=DEFAULT_SERVER)
    parser.add_argument("--dataset", default="eval_dataset")
    parser.add_argument("--robot-id", default=DEFAULT_ROBOT_ID)
    parser.add_argument("--scenario", choices=[*SCENARIOS, "all"], default="all")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--output-dir", default="eval_results")
    args = parser.parse_args()

    dataset = Path(args.dataset)
    rows = selected_rows(load_manifest(dataset), args.scenario, args.limit)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    totals = {name: {"total": 0, "correct": 0} for name in SCENARIOS}
    background_false_positive = 0
    processing_times: list[float] = []
    roundtrip_times: list[float] = []
    capture_to_result_times: list[float] = []
    details: list[dict[str, Any]] = []

    if not any((row.get("scenario") or "").strip().lower() == "static" for row in rows):
        print("Khong co mau static trong ground_truth.csv")

    for row in rows:
        test_id = (row.get("id") or "").strip()
        scenario = (row.get("scenario") or "").strip().lower()
        image_rel = (row.get("image_path") or "").strip()
        bg_rel = (row.get("background_path") or "").strip()
        expected_detected = (row.get("expected_detected") or "").strip().lower() == "true"
        expected_type = (row.get("expected_type") or "").strip()

        if scenario not in SCENARIOS or not test_id or not image_rel:
            print(f"SKIP dong khong hop le: {row}")
            continue

        image_path = dataset / image_rel
        bg_path = dataset / bg_rel if bg_rel else None
        if not image_path.exists():
            print(f"SKIP {test_id}: khong tim thay anh {image_path}")
            continue
        if scenario == "static" and (bg_path is None or not bg_path.exists()):
            print(f"SKIP {test_id}: static can background_path cung goc camera")
            continue

        if scenario == "static":
            calibrate_background(args.server, bg_path, args.robot_id, args.timeout)
        elif scenario == "moving":
            clear_background(args.server, args.robot_id, args.timeout)
            if bg_path is not None and bg_path.exists():
                post_image(args.server, bg_path, args.robot_id, args.timeout)
        else:
            clear_background(args.server, args.robot_id, args.timeout)

        result, roundtrip_ms = post_image(args.server, image_path, args.robot_id, args.timeout)
        roundtrip_times.append(roundtrip_ms)

        processing_ms = metric_value(result, "performance", "processingTimeMs") or metric_value(result, "latency", "serverProcessingMs")
        capture_to_result_ms = metric_value(result, "latency", "captureToResultMs")
        if processing_ms is not None:
            processing_times.append(processing_ms)
        if capture_to_result_ms is not None:
            capture_to_result_times.append(capture_to_result_ms)

        actual_types = [det.get("type", "") for det in result.get("detections", []) or []]
        actual_sources = [det.get("source", "") for det in result.get("detections", []) or []]
        totals[scenario]["total"] += 1

        if scenario == "background":
            false_positive = has_obstacle_false_positive(result)
            correct = not false_positive
            if false_positive:
                background_false_positive += 1
        elif expected_type:
            correct = has_detection_type(result, expected_type)
        else:
            correct = bool(result.get("detected")) == expected_detected

        if correct:
            totals[scenario]["correct"] += 1

        alert = result.get("alert") or {}
        safety_state = result.get("safetyState") or {}
        details.append({
            "id": test_id,
            "scenario": scenario,
            "image_path": image_rel,
            "background_path": bg_rel,
            "expected_detected": expected_detected,
            "expected_type": expected_type,
            "actual_detected": bool(result.get("detected")),
            "actual_types": "|".join(actual_types),
            "actual_sources": "|".join(actual_sources),
            "alert_type": alert.get("type"),
            "alert_level": alert.get("level"),
            "alert_action": alert.get("action"),
            "suggestedRobotState": safety_state.get("suggestedRobotState"),
            "correct": correct,
            "processingTimeMs": processing_ms,
            "captureToResultMs": capture_to_result_ms,
            "httpRoundtripMs": roundtrip_ms,
        })
        print(f"{'PASS' if correct else 'FAIL'} {test_id}: expected={expected_type or expected_detected}, actual={actual_types}, roundtrip={roundtrip_ms}ms")

    summary = {
        "robotId": args.robot_id,
        "scenario": args.scenario,
        "person_accuracy": {"correct": totals["person"]["correct"], "total": totals["person"]["total"], "percent": pct(totals["person"]["correct"], totals["person"]["total"])},
        "static_obstacle_accuracy": {"correct": totals["static"]["correct"], "total": totals["static"]["total"], "percent": pct(totals["static"]["correct"], totals["static"]["total"])},
        "moving_obstacle_accuracy": {"correct": totals["moving"]["correct"], "total": totals["moving"]["total"], "percent": pct(totals["moving"]["correct"], totals["moving"]["total"])},
        "background_false_positive": {"false_positive": background_false_positive, "total": totals["background"]["total"], "percent": pct(background_false_positive, totals["background"]["total"])},
        "processing_time_ms": summarize(processing_times),
        "http_roundtrip_ms": summarize(roundtrip_times),
        "capture_to_result_latency_ms": summarize(capture_to_result_times),
        "alert_clear_resume_success_rate": {"total": 0, "percent": None, "note": "Chua co test sequence rieng cho clear/resume."},
    }

    csv_path = output_dir / f"vision_metrics_{args.scenario}.csv"
    json_path = output_dir / f"vision_metrics_{args.scenario}.json"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        fieldnames = list(details[0].keys()) if details else [
            "id", "scenario", "image_path", "background_path", "expected_detected", "expected_type",
            "actual_detected", "actual_types", "actual_sources", "alert_type", "alert_level",
            "alert_action", "suggestedRobotState", "correct", "processingTimeMs",
            "captureToResultMs", "httpRoundtripMs",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(details)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n===== AI VISION METRICS SUMMARY =====")
    print(f"Person accuracy: {summary['person_accuracy']}")
    print(f"Static obstacle accuracy: {summary['static_obstacle_accuracy']}")
    print(f"Moving obstacle accuracy: {summary['moving_obstacle_accuracy']}")
    print(f"Background false positive: {summary['background_false_positive']}")
    print(f"Processing time ms: {summary['processing_time_ms']}")
    print(f"HTTP roundtrip ms: {summary['http_roundtrip_ms']}")
    print(f"Capture-to-result latency ms: {summary['capture_to_result_latency_ms']}")
    print(f"Saved: {csv_path}")
    print(f"Saved: {json_path}")


if __name__ == "__main__":
    main()
