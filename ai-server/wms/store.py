"""Lightweight JSON-backed WMS store for the 3-item demo."""

from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Any

from fastapi import HTTPException, UploadFile

from config import BASE_DIR, DEFAULT_ROBOT_ID
from robot.commands import append_command
from wms.storage import WMS_UPLOADS_DIR, ensure_upload_storage, save_upload, write_demo_placeholder
from utils import normalize_robot_id, now_ms

WMS_DATA_DIR = BASE_DIR / "wms_data"
WMS_STATE_FILE = WMS_DATA_DIR / "state.json"

VALID_ITEMS = ("ITEM-A", "ITEM-B", "ITEM-C")
VALID_TASK_TYPES = ("PUTAWAY", "PICKING", "TRANSFER")
RUNNING_STATUSES = {
    "CREATED",
    "GOING_TO_PICK",
    "PICK_PHOTO_UPLOADED",
    "PICKED",
    "MOVING_TO_DROP",
    "DROPPED",
    "DROP_PHOTO_UPLOADED",
}

_lock = RLock()


def _demo_items(timestamp: int) -> dict[str, dict[str, Any]]:
    return {
        "ITEM-A": {
            "itemId": "ITEM-A",
            "name": "Vật phẩm A",
            "quantity": 0,
            "locationId": None,
            "status": "OUT_OF_STOCK",
            "lastUpdatedAt": timestamp,
        },
        "ITEM-B": {
            "itemId": "ITEM-B",
            "name": "Vật phẩm B",
            "quantity": 0,
            "locationId": None,
            "status": "OUT_OF_STOCK",
            "lastUpdatedAt": timestamp,
        },
        "ITEM-C": {
            "itemId": "ITEM-C",
            "name": "Vật phẩm C",
            "quantity": 0,
            "locationId": None,
            "status": "OUT_OF_STOCK",
            "lastUpdatedAt": timestamp,
        },
    }


def _demo_locations(timestamp: int) -> dict[str, dict[str, Any]]:
    return {
        "INBOUND-01": {
            "locationId": "INBOUND-01",
            "name": "Bàn nhận hàng",
            "zone": "Nhập hàng",
            "itemId": None,
            "quantity": 0,
            "capacity": 99,
            "status": "EMPTY",
            "lastUpdatedAt": timestamp,
        },
        "OUTBOUND-01": {
            "locationId": "OUTBOUND-01",
            "name": "Bàn xuất hàng",
            "zone": "Xuất hàng",
            "itemId": None,
            "quantity": 0,
            "capacity": 99,
            "status": "EMPTY",
            "lastUpdatedAt": timestamp,
        },
        "SHELF-A1": {
            "locationId": "SHELF-A1",
            "name": "Kệ A1",
            "zone": "Khu A",
            "itemId": None,
            "quantity": 0,
            "capacity": 3,
            "status": "EMPTY",
            "lastUpdatedAt": timestamp,
        },
        "SHELF-B1": {
            "locationId": "SHELF-B1",
            "name": "Kệ B1",
            "zone": "Khu B",
            "itemId": None,
            "quantity": 0,
            "capacity": 3,
            "status": "EMPTY",
            "lastUpdatedAt": timestamp,
        },
        "SHELF-C1": {
            "locationId": "SHELF-C1",
            "name": "Kệ C1",
            "zone": "Khu C",
            "itemId": None,
            "quantity": 0,
            "capacity": 3,
            "status": "EMPTY",
            "lastUpdatedAt": timestamp,
        },
    }


def _default_state() -> dict[str, Any]:
    timestamp = now_ms()
    return {
        "inventory": _demo_items(timestamp),
        "locations": _demo_locations(timestamp),
        "tasks": {},
        "history": [],
        "alerts": [],
    }


def ensure_wms_storage() -> None:
    WMS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    ensure_upload_storage()


def _read_state() -> dict[str, Any]:
    ensure_wms_storage()
    if not WMS_STATE_FILE.exists():
        state = _default_state()
        _write_state(state)
        return state
    with WMS_STATE_FILE.open("r", encoding="utf-8") as file:
        state = json.load(file)
    timestamp = now_ms()
    state.setdefault("inventory", _demo_items(timestamp))
    state.setdefault("locations", _demo_locations(timestamp))
    state.setdefault("tasks", {})
    state.setdefault("history", [])
    state.setdefault("alerts", [])
    return state


def _write_state(state: dict[str, Any]) -> None:
    ensure_wms_storage()
    tmp_path = WMS_STATE_FILE.with_suffix(".json.tmp")
    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(state, file, ensure_ascii=False, indent=2)
    tmp_path.replace(WMS_STATE_FILE)


def _snapshot(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "inventory": list(state["inventory"].values()),
        "locations": list(state["locations"].values()),
        "tasks": sorted(state["tasks"].values(), key=lambda task: task["createdAt"], reverse=True),
        "history": sorted(state["history"], key=lambda item: item["timestamp"], reverse=True),
        "alerts": sorted(state["alerts"], key=lambda item: item["createdAt"], reverse=True),
    }


def get_summary() -> dict[str, Any]:
    with _lock:
        state = _read_state()
        locations = list(state["locations"].values())
        tasks = list(state["tasks"].values())
        alerts = list(state["alerts"])
        return {
            "totalItemTypes": len(state["inventory"]),
            "totalQuantity": sum(int(item.get("quantity") or 0) for item in state["inventory"].values()),
            "usedLocations": sum(1 for location in locations if location.get("status") == "OCCUPIED"),
            "totalLocations": len(locations),
            "runningTasks": sum(1 for task in tasks if task.get("status") in RUNNING_STATUSES),
            "alerts": len(alerts),
        }


def list_inventory() -> dict[str, Any]:
    with _lock:
        state = _read_state()
        return {"items": list(state["inventory"].values())}


def list_locations() -> dict[str, Any]:
    with _lock:
        state = _read_state()
        return {"locations": list(state["locations"].values())}


def list_tasks(robot_id: str | None = None) -> dict[str, Any]:
    with _lock:
        state = _read_state()
        tasks = _snapshot(state)["tasks"]
        if robot_id:
            normalized = normalize_robot_id(robot_id)
            tasks = [task for task in tasks if task.get("robotId") == normalized]
        return {"tasks": tasks}


def list_history() -> dict[str, Any]:
    with _lock:
        state = _read_state()
        return {"history": _snapshot(state)["history"]}


def list_alerts() -> dict[str, Any]:
    with _lock:
        state = _read_state()
        return {"alerts": _snapshot(state)["alerts"]}


def _add_alert(
    state: dict[str, Any],
    level: str,
    alert_type: str,
    message: str,
    *,
    item_id: str | None = None,
    location_id: str | None = None,
    task_id: str | None = None,
) -> dict[str, Any]:
    alert = {
        "alertId": f"WMS-ALERT-{now_ms()}-{len(state['alerts']) + 1}",
        "level": level,
        "type": alert_type,
        "message": message,
        "itemId": item_id,
        "locationId": location_id,
        "taskId": task_id,
        "createdAt": now_ms(),
    }
    state["alerts"].append(alert)
    return alert


def _add_history(
    state: dict[str, Any],
    *,
    task_id: str,
    robot_id: str,
    item_id: str,
    action: str,
    quantity_delta: int,
    from_location_id: str | None,
    to_location_id: str | None,
    note: str,
    proof_image_url: str | None = None,
) -> None:
    state["history"].append({
        "historyId": f"WMS-HIST-{now_ms()}-{len(state['history']) + 1}",
        "timestamp": now_ms(),
        "taskId": task_id,
        "robotId": robot_id,
        "itemId": item_id,
        "action": action,
        "quantityDelta": quantity_delta,
        "fromLocationId": from_location_id,
        "toLocationId": to_location_id,
        "note": note,
        "proofImageUrl": proof_image_url,
    })


def _validate_task_payload(state: dict[str, Any], payload: dict[str, Any]) -> tuple[str, str, int, str, str]:
    task_type = str(payload.get("type") or "PUTAWAY").upper()
    item_id = str(payload.get("itemId") or "")
    quantity = int(payload.get("quantity") or 1)
    from_location_id = str(payload.get("fromLocationId") or "INBOUND-01")
    to_location_id = str(payload.get("toLocationId") or "")

    if task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail="Loại nhiệm vụ WMS không hợp lệ.")
    if item_id not in VALID_ITEMS:
        raise HTTPException(status_code=400, detail="Mã vật phẩm không hợp lệ.")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng phải lớn hơn 0.")
    if from_location_id not in state["locations"]:
        raise HTTPException(status_code=400, detail="Vị trí lấy hàng không tồn tại.")
    if to_location_id not in state["locations"]:
        raise HTTPException(status_code=400, detail="Vị trí thả hàng không tồn tại.")

    destination = state["locations"][to_location_id]
    if task_type in {"PUTAWAY", "TRANSFER"}:
        if int(destination.get("quantity") or 0) + quantity > int(destination.get("capacity") or 0):
            _add_alert(
                state,
                "WARNING",
                "SHELF_FULL",
                f"{destination['name']} không đủ sức chứa cho nhiệm vụ mới.",
                item_id=item_id,
                location_id=to_location_id,
            )
            _write_state(state)
            raise HTTPException(status_code=409, detail="Kệ đích đã đầy hoặc không đủ sức chứa.")
    if task_type in {"PICKING", "TRANSFER"}:
        source = state["locations"][from_location_id]
        if source.get("itemId") != item_id or int(source.get("quantity") or 0) < quantity:
            _add_alert(
                state,
                "WARNING",
                "OUT_OF_STOCK",
                "Không đủ tồn kho tại vị trí nguồn để tạo nhiệm vụ.",
                item_id=item_id,
                location_id=from_location_id,
            )
            _write_state(state)
            raise HTTPException(status_code=409, detail="Không đủ hàng tại vị trí nguồn.")

    return task_type, item_id, quantity, from_location_id, to_location_id


def create_task(payload: dict[str, Any]) -> dict[str, Any]:
    with _lock:
        state = _read_state()
        task_type, item_id, quantity, from_location_id, to_location_id = _validate_task_payload(state, payload)
        robot_id = normalize_robot_id(payload.get("robotId") or DEFAULT_ROBOT_ID)
        task_id = str(payload.get("taskId") or f"WMS-{now_ms()}")
        timestamp = now_ms()
        task = {
            "taskId": task_id,
            "robotId": robot_id,
            "type": task_type,
            "itemId": item_id,
            "quantity": quantity,
            "fromLocationId": from_location_id,
            "toLocationId": to_location_id,
            "expectedLocationId": to_location_id,
            "status": "CREATED",
            "result": "PENDING_VERIFY",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
        state["tasks"][task_id] = task
        item = state["inventory"][item_id]
        item["status"] = "MOVING"
        item["lastUpdatedAt"] = timestamp

        if task_type in {"PUTAWAY", "TRANSFER"} and to_location_id.startswith("SHELF-"):
            destination = state["locations"][to_location_id]
            if destination.get("status") == "EMPTY":
                destination["status"] = "RESERVED"
                destination["lastUpdatedAt"] = timestamp

        _write_state(state)

    command = append_command(robot_id, {
        "type": "WMS_TASK",
        "command": "WMS_TASK",
        "taskId": task_id,
        "itemId": item_id,
        "quantity": quantity,
        "fromLocationId": from_location_id,
        "toLocationId": to_location_id,
        "expectedLocationId": to_location_id,
        "action": "PICK_AND_DROP",
    })
    return {"task": task, "command": command}


def _task_or_404(state: dict[str, Any], task_id: str) -> dict[str, Any]:
    task = state["tasks"].get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ WMS.")
    return task



def handle_robot_ack(
    task_id: str,
    robot_id: str,
    status: str,
    actual_location_id: str | None = None,
    allow_complete_without_photo: bool = False,
) -> dict[str, Any]:
    """Update WMS task progress from a simple ESP32-S3 ACK payload.

    Inventory is only completed from ACK when firmware explicitly sets
    allowCompleteWithoutPhoto=true. This protects the normal proof-image flow
    while still giving a controlled fallback for field demos.
    """
    normalized_status = str(status or "RECEIVED").upper()
    with _lock:
        state = _read_state()
        task = _task_or_404(state, task_id)
        if task.get("status") == "COMPLETED":
            return {"task": task, "idempotent": True}
        normalized_robot_id = normalize_robot_id(robot_id or task["robotId"])
        if normalized_robot_id != task["robotId"]:
            raise HTTPException(status_code=400, detail="Robot không khớp với nhiệm vụ WMS.")

        timestamp = now_ms()
        status_map = {
            "RECEIVED": "GOING_TO_PICK",
            "ACK": "GOING_TO_PICK",
            "STARTED": "GOING_TO_PICK",
            "PICKED": "PICKED",
            "MOVING_TO_DROP": "MOVING_TO_DROP",
            "DROPPED": "DROPPED",
            "FAILED": "FAILED",
            "ERROR": "FAILED",
        }

        task["robotAckStatus"] = normalized_status
        task["updatedAt"] = timestamp

        if normalized_status in status_map:
            task["status"] = status_map[normalized_status]
            if task["status"] == "FAILED":
                task["result"] = "ROBOT_FAILED"
        elif normalized_status == "COMPLETED":
            if allow_complete_without_photo:
                actual = actual_location_id or task["toLocationId"]
                task["actualLocationId"] = actual
                if not task.get("pickupProofImageUrl"):
                    _add_alert(
                        state,
                        "WARNING",
                        "MISSING_PROOF_IMAGE",
                        "Nhiệm vụ hoàn tất bằng ACK nhưng thiếu ảnh xác nhận lúc lấy hàng.",
                        item_id=task["itemId"],
                        task_id=task_id,
                    )
                if not task.get("dropProofImageUrl"):
                    _add_alert(
                        state,
                        "WARNING",
                        "MISSING_PROOF_IMAGE",
                        "Nhiệm vụ hoàn tất bằng ACK nhưng thiếu ảnh xác nhận sau khi thả hàng.",
                        item_id=task["itemId"],
                        task_id=task_id,
                    )
                if actual != task["expectedLocationId"]:
                    task["status"] = "FAILED"
                    task["result"] = "WRONG_LOCATION"
                    _add_alert(
                        state,
                        "CRITICAL",
                        "WRONG_LOCATION",
                        f"Robot báo hoàn tất nhưng vị trí thực tế là {actual}, kỳ vọng {task['expectedLocationId']}.",
                        item_id=task["itemId"],
                        location_id=actual,
                        task_id=task_id,
                    )
                else:
                    task["status"] = "COMPLETED"
                    task["result"] = "CORRECT_LOCATION"
                    _apply_successful_drop(state, task, task.get("dropProofImageUrl") or task.get("pickupProofImageUrl") or "", timestamp)
            else:
                task["status"] = "DROPPED"
                task["result"] = "PENDING_VERIFY"
                _add_alert(
                    state,
                    "WARNING",
                    "MISSING_PROOF_IMAGE",
                    "ESP32-S3 báo COMPLETED nhưng chưa có ảnh drop-photo; tồn kho chưa cập nhật cho đến khi gửi ảnh hoặc dùng demo thủ công.",
                    item_id=task["itemId"],
                    task_id=task_id,
                )
        else:
            task["status"] = task.get("status") or "CREATED"

        _write_state(state)
        return {"task": task}

def upload_pickup_photo(task_id: str, robot_id: str, image: UploadFile | None = None, manual: bool = False) -> dict[str, Any]:
    with _lock:
        state = _read_state()
        task = _task_or_404(state, task_id)
        normalized_robot_id = normalize_robot_id(robot_id or task["robotId"])
        if normalized_robot_id != task["robotId"]:
            raise HTTPException(status_code=400, detail="Robot không khớp với nhiệm vụ.")

        image_url = write_demo_placeholder(task_id, "pickup") if manual else save_upload(task_id, image, "pickup.jpg")
        timestamp = now_ms()
        task["pickupProofImageUrl"] = image_url
        task["status"] = "PICKED" if manual else "PICK_PHOTO_UPLOADED"
        task["updatedAt"] = timestamp
        _write_state(state)
        return {"task": task}


def _clear_location_if_empty(location: dict[str, Any], timestamp: int) -> None:
    if int(location.get("quantity") or 0) <= 0:
        location["quantity"] = 0
        location["itemId"] = None
        location["status"] = "EMPTY"
        location["lastUpdatedAt"] = timestamp


def _apply_successful_drop(state: dict[str, Any], task: dict[str, Any], image_url: str, timestamp: int) -> None:
    item = state["inventory"][task["itemId"]]
    destination = state["locations"][task["toLocationId"]]
    source = state["locations"][task["fromLocationId"]]
    quantity = int(task["quantity"])
    task_type = task["type"]

    if task_type == "PUTAWAY":
        item["quantity"] = int(item.get("quantity") or 0) + quantity
        _add_history(
            state,
            task_id=task["taskId"],
            robot_id=task["robotId"],
            item_id=task["itemId"],
            action="PUTAWAY",
            quantity_delta=quantity,
            from_location_id=task["fromLocationId"],
            to_location_id=task["toLocationId"],
            note="Nhập kho hoàn tất sau khi robot gửi ảnh xác nhận thả hàng.",
            proof_image_url=image_url,
        )
    elif task_type == "PICKING":
        item["quantity"] = max(int(item.get("quantity") or 0) - quantity, 0)
        source["quantity"] = max(int(source.get("quantity") or 0) - quantity, 0)
        _clear_location_if_empty(source, timestamp)
        _add_history(
            state,
            task_id=task["taskId"],
            robot_id=task["robotId"],
            item_id=task["itemId"],
            action="PICKING",
            quantity_delta=-quantity,
            from_location_id=task["fromLocationId"],
            to_location_id=task["toLocationId"],
            note="Xuất kho hoàn tất sau khi robot thả hàng ở bàn xuất.",
            proof_image_url=image_url,
        )
    else:
        source["quantity"] = max(int(source.get("quantity") or 0) - quantity, 0)
        _clear_location_if_empty(source, timestamp)
        _add_history(
            state,
            task_id=task["taskId"],
            robot_id=task["robotId"],
            item_id=task["itemId"],
            action="TRANSFER",
            quantity_delta=0,
            from_location_id=task["fromLocationId"],
            to_location_id=task["toLocationId"],
            note="Chuyển kệ hoàn tất sau khi robot gửi ảnh xác nhận.",
            proof_image_url=image_url,
        )

    if task_type != "PICKING":
        destination["quantity"] = int(destination.get("quantity") or 0) + quantity
        destination["itemId"] = task["itemId"]
        destination["status"] = "OCCUPIED"
        destination["lastProofImageUrl"] = image_url
        destination["lastUpdatedAt"] = timestamp

    item["locationId"] = None if item["quantity"] <= 0 else task["toLocationId"]
    item["status"] = "OUT_OF_STOCK" if item["quantity"] <= 0 else "IN_STOCK"
    item["lastUpdatedAt"] = timestamp


def upload_drop_photo(
    task_id: str,
    robot_id: str,
    actual_location_id: str | None = None,
    image: UploadFile | None = None,
    manual: bool = False,
) -> dict[str, Any]:
    with _lock:
        state = _read_state()
        task = _task_or_404(state, task_id)
        normalized_robot_id = normalize_robot_id(robot_id or task["robotId"])
        if normalized_robot_id != task["robotId"]:
            raise HTTPException(status_code=400, detail="Robot không khớp với nhiệm vụ.")
        if task.get("status") == "COMPLETED":
            return {
                "task": task,
                "inventory": list(state["inventory"].values()),
                "locations": list(state["locations"].values()),
                "alerts": sorted(state["alerts"], key=lambda item: item["createdAt"], reverse=True),
                "idempotent": True,
            }

        image_url = write_demo_placeholder(task_id, "drop") if manual else save_upload(task_id, image, "drop.jpg")
        timestamp = now_ms()
        actual = actual_location_id or task["toLocationId"]
        task["dropProofImageUrl"] = image_url
        task["actualLocationId"] = actual
        task["updatedAt"] = timestamp

        if not task.get("pickupProofImageUrl"):
            _add_alert(
                state,
                "WARNING",
                "MISSING_PROOF_IMAGE",
                "Nhiệm vụ thiếu ảnh xác nhận lúc lấy hàng.",
                item_id=task["itemId"],
                task_id=task_id,
            )

        if actual != task["expectedLocationId"]:
            task["status"] = "FAILED"
            task["result"] = "WRONG_LOCATION"
            _add_alert(
                state,
                "CRITICAL",
                "WRONG_LOCATION",
                f"Robot thả {task['itemId']} sai vị trí: {actual}, kỳ vọng {task['expectedLocationId']}.",
                item_id=task["itemId"],
                location_id=actual,
                task_id=task_id,
            )
        else:
            task["status"] = "COMPLETED"
            task["result"] = "CORRECT_LOCATION"
            _apply_successful_drop(state, task, image_url, timestamp)

        _write_state(state)
        return {
            "task": task,
            "inventory": list(state["inventory"].values()),
            "locations": list(state["locations"].values()),
            "alerts": sorted(state["alerts"], key=lambda item: item["createdAt"], reverse=True),
        }

