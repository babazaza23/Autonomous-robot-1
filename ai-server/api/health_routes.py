"""Health-check API routes for LAN/ESP32-S3 integration."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI

from utils import now_ms

SERVICE_NAME = "wms-robot-ai-server"


def build_health_payload() -> dict[str, Any]:
    """Return a small payload that is easy for ESP32-S3 firmware to parse."""
    return {
        "ok": True,
        "serverTime": now_ms(),
        "service": SERVICE_NAME,
    }


def register_health_routes(app: FastAPI) -> None:
    """Register lightweight health endpoints."""

    @app.get("/api/health")
    async def health_check() -> dict[str, Any]:
        return build_health_payload()
