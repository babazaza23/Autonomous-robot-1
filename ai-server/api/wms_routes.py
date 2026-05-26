"""Mini WMS API routes."""

from __future__ import annotations

from typing import Any

from fastapi import Body, FastAPI, File, Form, Query, UploadFile
from fastapi.staticfiles import StaticFiles

from config import DEFAULT_ROBOT_ID
from wms import store


def register_wms_routes(app: FastAPI) -> None:
    """Register WMS endpoints without changing robot/vision contracts."""
    store.ensure_wms_storage()
    app.mount("/api/wms/uploads", StaticFiles(directory=store.WMS_UPLOADS_DIR), name="wms_uploads")

    @app.get("/api/wms/summary")
    async def wms_summary() -> dict[str, Any]:
        return store.get_summary()

    @app.get("/api/wms/inventory")
    async def wms_inventory() -> dict[str, Any]:
        return store.list_inventory()

    @app.get("/api/wms/locations")
    async def wms_locations() -> dict[str, Any]:
        return store.list_locations()

    @app.get("/api/wms/tasks")
    async def wms_tasks(robotId: str | None = Query(None)) -> dict[str, Any]:
        return store.list_tasks(robotId)

    @app.post("/api/wms/tasks")
    async def wms_create_task(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
        return store.create_task(payload)

    @app.post("/api/wms/tasks/{task_id}/pickup-photo")
    async def wms_pickup_photo(
        task_id: str,
        robotId: str = Form(DEFAULT_ROBOT_ID),
        image: UploadFile = File(...),
    ) -> dict[str, Any]:
        return store.upload_pickup_photo(task_id, robotId, image=image)

    @app.post("/api/wms/tasks/{task_id}/drop-photo")
    async def wms_drop_photo(
        task_id: str,
        robotId: str = Form(DEFAULT_ROBOT_ID),
        actualLocationId: str | None = Form(None),
        image: UploadFile = File(...),
    ) -> dict[str, Any]:
        return store.upload_drop_photo(task_id, robotId, actual_location_id=actualLocationId, image=image)

    @app.post("/api/wms/tasks/{task_id}/manual-pickup")
    async def wms_manual_pickup(task_id: str, payload: dict[str, Any] | None = Body(None)) -> dict[str, Any]:
        body = payload or {}
        return store.upload_pickup_photo(task_id, body.get("robotId") or DEFAULT_ROBOT_ID, manual=True)

    @app.post("/api/wms/tasks/{task_id}/manual-drop")
    async def wms_manual_drop(task_id: str, payload: dict[str, Any] | None = Body(None)) -> dict[str, Any]:
        body = payload or {}
        return store.upload_drop_photo(
            task_id,
            body.get("robotId") or DEFAULT_ROBOT_ID,
            actual_location_id=body.get("actualLocationId"),
            manual=True,
        )

    @app.get("/api/wms/history")
    async def wms_history() -> dict[str, Any]:
        return store.list_history()

    @app.get("/api/wms/alerts")
    async def wms_alerts() -> dict[str, Any]:
        return store.list_alerts()
