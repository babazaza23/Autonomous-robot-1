"""WebSocket connection management."""

from typing import Any

from fastapi import WebSocket


class VisionConnectionManager:
    """Manages WebSocket connections for vision updates."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Unregister a WebSocket connection."""
        self.active_connections.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        """Send payload to all active connections, removing disconnected ones."""
        disconnected: list[WebSocket] = []
        for websocket in self.active_connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)
