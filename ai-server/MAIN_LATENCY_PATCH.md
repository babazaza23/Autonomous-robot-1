# Patch gợi ý để main.py trả thêm processingTimeMs và latency

Phần này không bắt buộc để script chạy, vì script vẫn đo `httpRoundtripMs`.
Nhưng nếu muốn có số liệu xử lý chính xác hơn trong server, bạn nên sửa `main.py`.

## 1. Sửa endpoint /api/frame nhận capturedAtMs

Tìm:

```python
@app.post("/api/frame")
async def receive_frame(
    file: UploadFile = File(...),
    robotId: str = Form(DEFAULT_ROBOT_ID),
) -> dict[str, Any]:
```

Sửa thành:

```python
@app.post("/api/frame")
async def receive_frame(
    file: UploadFile = File(...),
    robotId: str = Form(DEFAULT_ROBOT_ID),
    capturedAtMs: int | None = Form(None),
) -> dict[str, Any]:
```

## 2. Thêm đo thời gian xử lý

Trong `receive_frame`, trước dòng:

```python
latest_result = detect_objects(image, robot_id, timestamp)
```

thêm:

```python
process_start = time.perf_counter()
```

Sau dòng đó, thêm:

```python
processing_time_ms = round((time.perf_counter() - process_start) * 1000, 2)
server_result_at_ms = now_ms()

latest_result["performance"] = {
    "processingTimeMs": processing_time_ms,
    "frameWidth": int(image.shape[1]),
    "frameHeight": int(image.shape[0]),
}

latest_result["latency"] = {
    "capturedAtMs": capturedAtMs,
    "serverReceivedAtMs": timestamp,
    "serverResultAtMs": server_result_at_ms,
    "captureToServerMs": timestamp - capturedAtMs if capturedAtMs else None,
    "serverProcessingMs": processing_time_ms,
    "captureToResultMs": server_result_at_ms - capturedAtMs if capturedAtMs else None,
}
```

## 3. Giữ broadcast như cũ

```python
await manager.broadcast(latest_result)
return latest_result
```
