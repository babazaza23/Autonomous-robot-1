"""Vision API routes."""

import shutil
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import Body, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, FastAPI

from config import (
    FRAMES_DIR,
    LATEST_FRAME_PATH,
    DEFAULT_ROBOT_ID,
    MODEL_NAME,
    EVENT_LABELS,
    MAX_FRAME_UPLOAD_BYTES,
    FRAME_MIN_INTERVAL_MS,
)
from connection import VisionConnectionManager
from utils import (
    normalize_robot_id,
    now_ms,
    frame_path_for_robot,
    make_vision_ws_payload,
    get_vision_session,
)
from vision.detection import get_model, model_error
from vision.processing import detect_objects, empty_result
from vision.roi import path_roi_config
from robot.telemetry import register_robot_if_needed

# WebSocket manager for vision updates
manager = VisionConnectionManager()

# Global state
latest_vision_results_by_robot_id: dict[str, dict[str, Any]] = {}
latest_frame_paths_by_robot_id: dict[str, Path] = {}
last_frame_received_at_by_robot_id: dict[str, int] = {}


def get_latest_vision_result(robot_id: str) -> dict[str, Any]:
    """Return the latest vision result for a robot or an empty valid contract."""
    normalized = normalize_robot_id(robot_id)
    return latest_vision_results_by_robot_id.get(normalized) or empty_result(normalized, now_ms())


def get_latest_frame_response(robot_id: str) -> Any:
    """Return the latest frame response for a robot."""
    from fastapi.responses import FileResponse
    from utils import safe_robot_filename

    normalized = normalize_robot_id(robot_id)
    frame_path = latest_frame_paths_by_robot_id.get(normalized)
    if frame_path is None and normalized == DEFAULT_ROBOT_ID and LATEST_FRAME_PATH.exists():
        frame_path = LATEST_FRAME_PATH
    if frame_path is None or not frame_path.exists():
        raise HTTPException(status_code=404, detail=f"No frame has been received yet for {normalized}")

    return FileResponse(
        path=frame_path,
        media_type="image/jpeg",
        filename=f"latest_{safe_robot_filename(normalized)}.jpg",
        headers={"Cache-Control": "no-store"},
    )


def register_vision_routes(app: FastAPI) -> None:
    """Register all vision-related endpoints."""

    @app.get("/")
    async def health_check() -> dict[str, Any]:
        """Health check endpoint with service information."""
        return {
            "status": "running",
            "mode": "no-training",
            "service": "WMS Robot Vision AI Server",
            "model": MODEL_NAME,
            "modelReady": get_model() is not None,
            "modelError": model_error,
            "eventLabels": EVENT_LABELS,
            "visionFilter": {
                "backgroundCalibrated": get_vision_session(DEFAULT_ROBOT_ID).background_gray_frame is not None,
                "backgroundCalibratedAt": get_vision_session(DEFAULT_ROBOT_ID).background_calibrated_at,
                "staticObstacleRequiresBackground": True,
                "rejectFullFrameObstacle": True,
                "smallObstacleMinAreaRatio": 0.008,
                "minObstacleAreaRatio": 0.03,
                "maxObstacleAreaRatio": 0.45,
                "fullFrameCoverageRatio": 0.85,
                "roi": {"xMin": 0.15, "xMax": 0.85, "yMin": 0.35},
                "pathRoi": path_roi_config(),
                "clearFrameRequired": 3,
                "personClearFrameRequired": 5,
                "endpoints": [
                    "POST /api/vision/calibrate-background",
                    "POST /api/vision/clear-background",
                    "GET /api/vision/background-status",
                ],
            },
            "robotTelemetry": {
                "enabled": True,
                "endpoints": [
                    "POST /api/robots",
                    "GET /api/robots",
                    "GET /api/robots/{robotId}",
                    "POST /api/robot/telemetry",
                    f"GET /api/robot/latest?robotId={DEFAULT_ROBOT_ID}",
                    "POST /api/robot/task",
                    f"GET /api/robot/command?robotId={DEFAULT_ROBOT_ID}",
                    "POST /api/robot/ack",
                    "WS /ws/robot",
                ],
            },
        }

    @app.post("/api/vision/calibrate-background")
    async def calibrate_background(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Calibrate background for static obstacle detection."""
        robot_id = normalize_robot_id(robotId)
        session = get_vision_session(robot_id)
        frame_path = latest_frame_paths_by_robot_id.get(robot_id) or (LATEST_FRAME_PATH if robot_id == DEFAULT_ROBOT_ID else None)

        if frame_path is None or not frame_path.exists():
            raise HTTPException(status_code=404, detail=f"No latest frame available for calibration of {robot_id}")

        image = cv2.imread(str(frame_path), cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=500, detail="Cannot read latest frame for calibration")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        session.background_gray_frame = gray.copy()
        session.previous_gray_frame = gray.copy()
        session.background_calibrated_at = now_ms()

        return {
            "ok": True,
            "robotId": robot_id,
            "calibrated": True,
            "calibratedAt": session.background_calibrated_at,
            "message": "Background calibrated. Static objects currently visible will be ignored.",
            "note": "Static OpenCV obstacles are now detected only as differences from this background",
        }

    @app.post("/api/vision/clear-background")
    async def clear_background(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Clear background calibration."""
        robot_id = normalize_robot_id(robotId)
        session = get_vision_session(robot_id)
        session.background_gray_frame = None
        session.background_calibrated_at = None
        session.previous_gray_frame = None
        return {
            "ok": True,
            "robotId": robot_id,
            "calibrated": False,
            "message": "Background calibration cleared",
            "note": "Static OpenCV obstacle detection is disabled until calibration is performed again",
        }

    @app.get("/api/vision/background-status")
    async def background_status(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Get background calibration status."""
        robot_id = normalize_robot_id(robotId)
        session = get_vision_session(robot_id)
        frame_path = latest_frame_paths_by_robot_id.get(robot_id)
        return {
            "robotId": robot_id,
            "calibrated": session.background_gray_frame is not None,
            "calibratedAt": session.background_calibrated_at,
            "hasLatestFrame": bool(frame_path and frame_path.exists()),
            "staticObstacleRequiresBackground": True,
            "filter": {
                "minAreaRatio": 0.03,
                "smallObstacleMinAreaRatio": 0.008,
                "maxAreaRatio": 0.45,
                "fullFrameCoverageRatio": 0.85,
                "roiXMin": 0.15,
                "roiXMax": 0.85,
                "roiYMin": 0.35,
                "pathRoi": path_roi_config(),
                "clearFrameRequired": 3,
                "personClearFrameRequired": 5,
            },
        }

    @app.post("/api/frame")
    async def receive_frame(
        file: UploadFile | None = File(None),
        frame: UploadFile | None = File(None),
        robotId: str | None = Form(None),
        robotIdQuery: str | None = Query(None, alias="robotId"),
        capturedAtMs: int | None = Form(None),
    ) -> dict[str, Any]:
        """Receive a realtime camera frame from ESP32-S3 and process vision.

        Backward compatibility: old clients can upload the file field as `file`;
        ESP32-S3 firmware can use the simpler documented field name `frame`.
        """
        timestamp = now_ms()
        server_received_at_ms = timestamp
        robot_id = normalize_robot_id(robotId or robotIdQuery)
        register_robot_if_needed(robot_id)

        previous_received_at = last_frame_received_at_by_robot_id.get(robot_id, 0)
        if timestamp - previous_received_at < FRAME_MIN_INTERVAL_MS:
            latest = latest_vision_results_by_robot_id.get(robot_id)
            if latest is not None:
                return {
                    **latest,
                    "rateLimited": True,
                    "message": "Frame bị bỏ qua để tránh quá tải; khuyến nghị ESP32-S3 gửi 1-2 fps cho AI Vision.",
                }

        upload = frame or file
        if upload is None:
            raise HTTPException(status_code=400, detail="Thiếu file ảnh. Dùng multipart field `frame` hoặc `file`.")

        try:
            contents = await upload.read()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Cannot read uploaded frame: {exc}") from exc

        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded frame is empty")
        if len(contents) > MAX_FRAME_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Ảnh realtime quá lớn. Khuyến nghị JPEG 320x240 hoặc 640x480, tối đa 2 MB.")

        last_frame_received_at_by_robot_id[robot_id] = timestamp

        image_array = np.frombuffer(contents, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid JPEG image")

        frame_path = frame_path_for_robot(robot_id)
        ok = cv2.imwrite(str(frame_path), image)
        if not ok:
            raise HTTPException(status_code=500, detail="Cannot save latest frame")
        latest_frame_paths_by_robot_id[robot_id] = frame_path
        if robot_id == DEFAULT_ROBOT_ID:
            shutil.copyfile(frame_path, LATEST_FRAME_PATH)

        process_start = time.perf_counter()
        latest_result = detect_objects(image, robot_id, timestamp)
        processing_time_ms = round((time.perf_counter() - process_start) * 1000, 2)
        server_result_at_ms = now_ms()
        capture_to_server_ms = server_received_at_ms - capturedAtMs if capturedAtMs is not None else None
        capture_to_result_ms = server_result_at_ms - capturedAtMs if capturedAtMs is not None else None
        latest_result["performance"] = {
            "processingTimeMs": processing_time_ms,
            "frameWidth": int(image.shape[1]),
            "frameHeight": int(image.shape[0]),
        }
        latest_result["latency"] = {
            "capturedAtMs": capturedAtMs,
            "serverReceivedAtMs": server_received_at_ms,
            "serverResultAtMs": server_result_at_ms,
            "captureToServerMs": capture_to_server_ms,
            "serverProcessingMs": processing_time_ms,
            "captureToResultMs": capture_to_result_ms,
        }
        latest_result["imageUrl"] = f"/api/latest-frame?robotId={robot_id}&t={timestamp}"
        latest_vision_results_by_robot_id[robot_id] = latest_result
        await manager.broadcast(make_vision_ws_payload(latest_result))
        return latest_result

    @app.get("/api/latest-frame")
    async def latest_frame(robotId: str = Query(DEFAULT_ROBOT_ID)) -> Any:
        """Get latest frame for robot."""
        return get_latest_frame_response(robotId)

    @app.get("/api/latest-result")
    async def latest_detection_result(robotId: str = Query(DEFAULT_ROBOT_ID)) -> dict[str, Any]:
        """Get latest vision detection result."""
        return get_latest_vision_result(robotId)

    @app.websocket("/ws/vision")
    async def vision_websocket(websocket: WebSocket) -> None:
        """WebSocket endpoint for vision updates."""
        await manager.connect(websocket)
        try:
            if latest_vision_results_by_robot_id:
                for result in latest_vision_results_by_robot_id.values():
                    await websocket.send_json(make_vision_ws_payload(result))

            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception:
            manager.disconnect(websocket)
            import asyncio
            await asyncio.sleep(0)
