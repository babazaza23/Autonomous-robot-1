"""API routes module."""

from fastapi import FastAPI


def register_routes(app: FastAPI) -> None:
    """Register all API routes."""
    from .health_routes import register_health_routes
    from .vision_routes import register_vision_routes
    from .robot_routes import register_robot_routes
    from .wms_routes import register_wms_routes
    
    register_health_routes(app)
    register_vision_routes(app)
    register_robot_routes(app)
    register_wms_routes(app)
