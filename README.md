# WMS Robot Tự Hành

Đề tài: **Thiết kế mô hình robot tự hành trong quản lý kho**.

Project gồm frontend React/Vite, backend FastAPI, AI Vision an toàn và module **WMS mini cho 3 vật phẩm**. Demo chính dùng `robot-01` với ESP32-S3, nhưng dữ liệu realtime đã gắn `robotId` để sẵn sàng mở rộng `robot-02`, `robot-03`.

## Kiến Trúc

- Frontend React + TypeScript + Vite + TailwindCSS v4 hiển thị tổng quan, kho hàng, nhiệm vụ, robot, Camera AI, cảnh báo và nhật ký.
- FastAPI AI Server nhận frame qua `POST /api/frame`, telemetry qua `POST /api/robot/telemetry`, phát realtime qua `/ws/vision` và `/ws/robot`.
- WMS mini quản lý tồn kho, vị trí kệ, nhiệm vụ vận chuyển, ảnh xác nhận pickup/drop, lịch sử tồn kho và cảnh báo kho.
- ESP32-S3 lấy lệnh bằng `GET /api/robot/command?robotId=robot-01`, chạy robot dò line, gửi ảnh xác nhận và ACK về server.
- Khi chưa có ESP32-S3, dùng `robot_telemetry_simulator.py`, `webcam_client.py` và nút demo thủ công trong trang **Nhiệm vụ**.

## WMS Mini Cho 3 Vật Phẩm

Vật phẩm demo:

- `ITEM-A`: Vật phẩm A
- `ITEM-B`: Vật phẩm B
- `ITEM-C`: Vật phẩm C

Vị trí kho:

- `INBOUND-01`: Bàn nhận hàng
- `SHELF-A1`: Kệ A1
- `SHELF-B1`: Kệ B1
- `SHELF-C1`: Kệ C1
- `OUTBOUND-01`: Bàn xuất hàng

Dữ liệu WMS dùng JSON runtime trong `ai-server/wms_data/state.json`. Ảnh xác nhận được lưu theo sự kiện trong `ai-server/wms_uploads/tasks/{taskId}/`, không lưu mọi frame realtime.

## Quy Trình Demo WMS

1. Tạo nhiệm vụ nhập kho, ví dụ đưa Vật phẩm A vào Kệ A1.
2. Server tạo task WMS và đẩy command `WMS_TASK` vào queue của robot.
3. Robot lấy lệnh, đi đến `INBOUND-01`.
4. Robot chụp ảnh lúc lấy hàng và gửi `pickup-photo`.
5. Robot đi đến kệ đích, thả hàng, chụp ảnh và gửi `drop-photo`.
6. Nếu `actualLocationId` đúng với `expectedLocationId`, server cập nhật số lượng vật phẩm, vị trí kệ và lịch sử tồn kho.
7. Nếu sai vị trí, server tạo cảnh báo `WRONG_LOCATION` và không cập nhật tồn kho như hoàn thành đúng.

## API WMS

- `GET /api/wms/summary`
- `GET /api/wms/inventory`
- `GET /api/wms/locations`
- `GET /api/wms/tasks`
- `GET /api/wms/tasks?robotId=robot-01`
- `POST /api/wms/tasks`
- `POST /api/wms/tasks/{taskId}/pickup-photo`
- `POST /api/wms/tasks/{taskId}/drop-photo`
- `POST /api/wms/tasks/{taskId}/manual-pickup`
- `POST /api/wms/tasks/{taskId}/manual-drop`
- `GET /api/wms/history`
- `GET /api/wms/alerts`
- `GET /api/wms/uploads/...`

Ví dụ tạo nhiệm vụ:

```json
{
  "robotId": "robot-01",
  "type": "PUTAWAY",
  "itemId": "ITEM-A",
  "quantity": 1,
  "fromLocationId": "INBOUND-01",
  "toLocationId": "SHELF-A1"
}
```

## ESP32-S3 Flow

```text
GET  /api/robot/command?robotId=robot-01
POST /api/wms/tasks/{taskId}/pickup-photo
POST /api/wms/tasks/{taskId}/drop-photo
POST /api/robot/ack
```

`pickup-photo` dùng `multipart/form-data`:

- `robotId=robot-01`
- `image=<ảnh>`

`drop-photo` dùng `multipart/form-data`:

- `robotId=robot-01`
- `actualLocationId=SHELF-A1`
- `image=<ảnh>`

ACK mẫu:

```json
{
  "robotId": "robot-01",
  "taskId": "WMS-...",
  "status": "COMPLETED"
}
```

## Chạy Frontend Trên Windows

```powershell
npm install
npm run dev
npm run build
npm run lint
```

Cấu hình host AI/WMS server:

```powershell
$env:VITE_AI_SERVER_HOST="127.0.0.1:8000"
npm run dev
```

## Chạy Backend Trên Windows

```powershell
cd ai-server
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Demo Khi Chưa Có ESP32-S3

```powershell
cd ai-server
py robot_telemetry_simulator.py --robot-id robot-01
py robot_telemetry_simulator.py --count 3
py webcam_client.py --robot-id robot-01 --server http://localhost:8000
```

Sau đó mở web, vào trang **Nhiệm vụ**, dùng:

- Tạo nhiệm vụ
- Xác nhận lấy hàng
- Xác nhận thả hàng

Chế độ thủ công tạo ảnh placeholder và chỉ dùng khi chưa có tín hiệu thật từ ESP32-S3.

## AI Vision Và Model YOLO

Nếu có internet, có thể để Ultralytics tải model theo cấu hình. Khi chạy offline, đặt model vào:

```text
ai-server/yolo11n.pt
```

Hoặc cấu hình:

```powershell
$env:YOLO_MODEL_PATH="D:\models\yolo11n.pt"
```

Nếu không có model, server vẫn chạy OpenCV-only mode để demo WMS/robot; phần nhận diện người bằng YOLO sẽ báo rõ model chưa sẵn sàng.

## Hiệu Năng Khuyến Nghị

- Telemetry robot: khoảng 1Hz.
- Camera AI realtime: 1 đến 2 fps.
- WMS chỉ lưu 2 ảnh theo sự kiện mỗi task: pickup và drop.
- Không dùng `/api/frame` làm bằng chứng WMS.
- Không chạy AI nhận diện 3 vật phẩm trong phạm vi demo hiện tại.

## Dataset Và Evaluation

`ai-server/eval_dataset/ground_truth.csv` dùng format:

```csv
id,scenario,image_path,background_path,expected_detected,expected_type
```

Scenario hợp lệ: `background`, `person`, `static`, `moving`.

Chạy thử:

```powershell
cd ai-server
py test_vision_false_obstacle.py
py test_path_roi.py
py evaluate_vision_metrics.py --scenario background --limit 5
```

Static obstacle cần cặp ảnh cùng góc camera, ví dụ `bg_static_01.jpg` và `obstacle_static_01.jpg`.

## File Không Commit

- `node_modules/`, `dist/`, `build/`, `.vite/`
- `.venv/`, `venv/`, `__pycache__/`
- `ai-server/frames/`, `ai-server/runs/`, `ai-server/wms_uploads/`
- `*.pt`, `*.onnx`, `*.engine`, `*.zip`
- `.env`, `logs/`, `*.log`

Tạo ZIP sạch:

```powershell
.\scripts\make_clean_zip.ps1
```


## Cấu hình LAN cho ESP32-S3

Backend phải chạy trên mọi interface mạng, không chỉ localhost:

```powershell
cd ai-server
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Kiểm tra server sống:

```text
GET http://<IP-LAN-MAY-SERVER>:8000/api/health
```

Payload trả về nhẹ để ESP32-S3 dễ parse:

```json
{
  "ok": true,
  "serverTime": 1710000000000,
  "service": "wms-robot-ai-server"
}
```

Lưu ý IP:

- `localhost` chỉ dùng trên máy đang chạy server.
- ESP32-S3 phải dùng IP LAN của máy server, ví dụ `http://192.168.1.10:8000`.
- Nếu IP máy server thay đổi, cần cập nhật lại cấu hình firmware ESP32-S3 hoặc cấu hình host trong giao diện Camera.
- Nếu ESP32-S3 không gọi được server, kiểm tra Windows Firewall và mở inbound rule cho cổng `8000`.

## API tối thiểu cho ESP32-S3

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

Nếu ESP32-S3 không gửi `robotId`, server sẽ mặc định là `robot-01`.

Lấy command:

```text
GET /api/robot/command?robotId=robot-01
```

Không có lệnh:

```json
{
  "hasCommand": false,
  "command": null
}
```

Có lệnh WMS:

```json
{
  "hasCommand": true,
  "command": {
    "commandId": "CMD-...",
    "type": "WMS_TASK",
    "taskId": "WMS-...",
    "itemId": "ITEM-A",
    "fromLocationId": "INBOUND-01",
    "toLocationId": "SHELF-A1",
    "action": "PICK_AND_DROP"
  }
}
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

Gửi frame realtime AI:

```http
POST /api/frame
Content-Type: multipart/form-data
```

Form fields:

- `robotId=robot-01`
- `frame=<file JPEG>`
- `capturedAtMs=<optional>`

Gửi ảnh chứng minh WMS:

```text
POST /api/wms/tasks/{taskId}/pickup-photo
POST /api/wms/tasks/{taskId}/drop-photo
```

Form fields pickup:

- `robotId=robot-01`
- `image=<file JPEG>`

Form fields drop:

- `robotId=robot-01`
- `actualLocationId=SHELF-A1`
- `image=<file JPEG>`

Khuyến nghị ESP32-S3 gửi JPEG `320x240` hoặc `640x480`, telemetry khoảng `1Hz`, command polling khoảng `1Hz`, frame AI `1-2 fps`. `/api/frame` chỉ giữ frame mới nhất theo robot, còn ảnh WMS pickup/drop lưu riêng theo task.

## Luồng demo khi có ESP32-S3

1. ESP32-S3 kết nối cùng Wi-Fi/LAN với máy server.
2. ESP32-S3 gọi `GET /api/health` để kiểm tra server.
3. ESP32-S3 gửi telemetry định kỳ bằng `POST /api/robot/telemetry`.
4. Web hiển thị `robot-01` trực tuyến.
5. Người vận hành tạo nhiệm vụ WMS trên web.
6. ESP32-S3 poll `GET /api/robot/command?robotId=robot-01` và nhận `WMS_TASK`.
7. ESP32-S3 gửi ACK `RECEIVED`, robot đi lấy hàng.
8. Robot gửi `pickup-photo`, đi đến kệ, gửi `drop-photo` kèm `actualLocationId`.
9. Server cập nhật tồn kho, vị trí kệ, lịch sử và cảnh báo nếu sai vị trí.
10. Web cập nhật qua WebSocket hoặc polling nhẹ.

## Kiểm tra nhanh trước demo

```powershell
cd ai-server
py -m py_compile main.py
py test_vision_false_obstacle.py
py test_path_roi.py
py robot_telemetry_simulator.py --robot-id robot-01
py webcam_client.py --robot-id robot-01 --server http://localhost:8000
```

Mở frontend:

```powershell
npm install
npm run dev
npm run build
npm run lint
```
