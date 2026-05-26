"""Runtime storage helpers for WMS proof images."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile

from config import BASE_DIR, MAX_WMS_PROOF_IMAGE_BYTES

WMS_UPLOADS_DIR = BASE_DIR / "wms_uploads"


def ensure_upload_storage() -> None:
    """Create runtime upload directories when the server starts."""
    WMS_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def image_url_for(task_id: str, filename: str) -> str:
    """Return the public URL served by StaticFiles in wms_routes."""
    return f"/api/wms/uploads/tasks/{task_id}/{filename}"


def save_upload(task_id: str, upload: UploadFile | None, filename: str) -> str:
    """Persist one WMS proof image with a small size guard for ESP32-S3."""
    if upload is None:
        raise HTTPException(status_code=400, detail="Thiếu ảnh xác nhận WMS.")

    task_dir = WMS_UPLOADS_DIR / "tasks" / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    target = task_dir / filename

    total = 0
    with target.open("wb") as file:
        while True:
            chunk = upload.file.read(1024 * 64)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_WMS_PROOF_IMAGE_BYTES:
                target.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail="Ảnh xác nhận quá lớn. Khuyến nghị ESP32-S3 gửi JPEG 320x240 hoặc 640x480, tối đa 2 MB.",
                )
            file.write(chunk)

    if total == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Ảnh xác nhận WMS rỗng.")

    return image_url_for(task_id, filename)


def write_demo_placeholder(task_id: str, phase: str) -> str:
    """Create a tiny SVG proof for manual demo mode when ESP32-S3 is absent."""
    task_dir = WMS_UPLOADS_DIR / "tasks" / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{phase}-demo.svg"
    label = "Ảnh demo lúc lấy hàng" if phase == "pickup" else "Ảnh demo sau khi thả hàng"
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
        '<rect width="100%" height="100%" fill="#F8FAFC"/>'
        '<rect x="24" y="24" width="592" height="312" rx="16" fill="#FFFFFF" stroke="#E2E8F0"/>'
        f'<text x="320" y="174" text-anchor="middle" font-family="Arial" font-size="24" fill="#0F172A">{label}</text>'
        f'<text x="320" y="214" text-anchor="middle" font-family="Arial" font-size="16" fill="#64748B">{task_id}</text>'
        '</svg>'
    )
    (task_dir / filename).write_text(svg, encoding="utf-8")
    return image_url_for(task_id, filename)
