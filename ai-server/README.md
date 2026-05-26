# AI Vision Server - Hướng dẫn chạy trên Windows

README này dùng cho thư mục `ai-server`.

## 1. Mở PowerShell tại thư mục project

Nếu bạn đang ở thư mục chứa `ai-server`, chạy:

```powershell
cd ai-server
```

## 2. Kiểm tra Python

Ưu tiên dùng lệnh:

```powershell
py --version
```

Nếu không chạy được, dùng:

```powershell
python --version
```

## 3. Cài thư viện

Không cần tạo môi trường ảo `.venv`. Cài trực tiếp bằng Python trên máy:

```powershell
py -m pip install --upgrade pip
py -m pip install -r requirements.txt
```

Nếu máy bạn không dùng được lệnh `py`, dùng:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 4. Chạy test kiểm tra lỗi false obstacle

```powershell
py test_vision_false_obstacle.py
```

Nếu dùng `python`:

```powershell
python test_vision_false_obstacle.py
```

Kết quả đúng là tất cả test đều `PASS`.

## 5. Chạy AI Vision Server

```powershell
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Nếu dùng `python`:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Sau khi chạy thành công, mở trình duyệt:

```text
http://localhost:8000
```

Kiểm tra kết quả AI mới nhất:

```text
http://localhost:8000/api/latest-result
```

Kiểm tra trạng thái background:

```text
http://localhost:8000/api/vision/background-status
```

## 6. Chạy webcam client

Mở thêm một cửa sổ PowerShell mới, vào lại thư mục `ai-server`:

```powershell
cd ai-server
py webcam_client.py
```

Nếu dùng `python`:

```powershell
python webcam_client.py
```

Webcam client sẽ gửi ảnh từ webcam laptop lên AI Server qua endpoint:

```text
POST /api/frame
```

## 7. Calibrate background

Chỉ calibrate khi camera đang nhìn nền/tủ/kệ bình thường và không có vật cản mới trước camera.

Chạy lệnh này trong PowerShell:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/vision/calibrate-background
```

Sau khi calibrate:

- Tủ, nền, tường, giường, kệ đang có sẵn trong khung hình sẽ bị xem là background.
- Static obstacle chỉ được báo khi có vật mới xuất hiện sau khi calibrate.
- Nếu chưa calibrate, server không được báo `OBSTACLE_STATIC`.

## 8. Kiểm tra background

```text
http://localhost:8000/api/vision/background-status
```

Hoặc dùng PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/api/vision/background-status
```

Kết quả mong muốn sau khi calibrate:

```json
{
  "calibrated": true,
  "hasLatestFrame": true
}
```

## 9. Clear background nếu muốn calibrate lại

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/vision/clear-background
```

Sau khi clear background, muốn phát hiện `OBSTACLE_STATIC` thì phải calibrate lại.

## 10. Kết quả mong muốn khi không có vật cản mới

Khi chỉ có nền/tủ/kệ phía sau, `latest-result` phải trả:

```json
{
  "detected": false,
  "detections": [],
  "alert": null
}
```

Không được còn detection dạng:

```text
x=0 y=0 w=320 h=240 area=100%
```

Nếu vẫn thấy bbox phủ toàn frame như trên thì lỗi false obstacle chưa được xử lý đúng.

## 11. Các endpoint chính

```text
GET  /
POST /api/frame
GET  /api/latest-frame
GET  /api/latest-result
WS   /ws/vision
POST /api/vision/calibrate-background
GET  /api/vision/background-status
POST /api/vision/clear-background
```

## 12. Thứ tự chạy nhanh

Mở PowerShell thứ nhất:

```powershell
cd ai-server
py -m pip install -r requirements.txt
py test_vision_false_obstacle.py
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Mở PowerShell thứ hai:

```powershell
cd ai-server
py webcam_client.py
```

Khi webcam đã gửi frame lên server, calibrate background:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/vision/calibrate-background
```

Sau đó mở:

```text
http://localhost:8000/api/latest-result
```
## API LAN / ESP32-S3 sau khi tích hợp WMS

Health check dành cho ESP32-S3:

```text
GET /api/health
```

Kết quả:

```json
{
  "ok": true,
  "serverTime": 1710000000000,
  "service": "wms-robot-ai-server"
}
```

Telemetry tối thiểu:

```http
POST /api/robot/telemetry
Content-Type: application/json
```

```json
{
  "robotId": "robot-01",
  "battery": 85,
  "state": "FOLLOW_LINE",
  "lineDetected": true,
  "ultrasonicFrontCm": 30
}
```

Command polling:

```text
GET /api/robot/command?robotId=robot-01
```

ACK:

```http
POST /api/robot/ack
Content-Type: application/json
```

```json
{
  "robotId": "robot-01",
  "commandId": "CMD-...",
  "taskId": "WMS-...",
  "status": "RECEIVED"
}
```

Frame realtime AI:

```http
POST /api/frame
Content-Type: multipart/form-data
```

Form fields: `robotId`, `frame`, `capturedAtMs` tùy chọn.

Ảnh chứng minh WMS:

```text
POST /api/wms/tasks/{taskId}/pickup-photo
POST /api/wms/tasks/{taskId}/drop-photo
```

Form fields pickup: `robotId`, `image`.
Form fields drop: `robotId`, `actualLocationId`, `image`.

## Chạy simulator và webcam với robotId

Simulator telemetry:

```powershell
cd ai-server
py robot_telemetry_simulator.py --robot-id robot-01
```

Webcam client:

```powershell
cd ai-server
py webcam_client.py --robot-id robot-01 --server http://localhost:8000
```

## Ghi chú LAN và Firewall

- Server phải chạy bằng `--host 0.0.0.0 --port 8000` để ESP32-S3 trong cùng LAN truy cập được.
- `localhost` chỉ dùng trên máy server. ESP32-S3 phải dùng IP LAN, ví dụ `http://192.168.1.10:8000`.
- Nếu ESP32-S3 không truy cập được `GET /api/health`, kiểm tra Windows Firewall và mở cổng inbound `8000`.
- Khuyến nghị JPEG `320x240` hoặc `640x480`; AI Vision gửi `1-2 fps`, telemetry `1Hz`, command polling `1Hz`.
- Không commit `wms_uploads`, `frames`, `runs`, file model `.pt/.onnx/.engine` hoặc file `.env`.
