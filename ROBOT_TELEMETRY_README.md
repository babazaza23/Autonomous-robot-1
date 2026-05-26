# Robot Telemetry cho WMS Robot Tự Hành

## Chạy AI/Telemetry Server

```powershell
cd ai-server
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health check:

```text
http://localhost:8000
```

## ESP32-S3 gửi heartbeat/telemetry

ESP32-S3 cần POST JSON đến:

```text
http://<IP_LAPTOP>:8000/api/robot/telemetry
```

Mỗi telemetry bắt buộc có `robotId`, ví dụ `AGV-WMS-01`. Web sẽ coi robot Online nếu nhận heartbeat trong 3 giây gần nhất và Offline nếu quá 5 giây không có telemetry.

## Endpoint robot

- `POST /api/robots`: đăng ký robot mới, trạng thái Registered/Offline.
- `GET /api/robots`: danh sách robot đã đăng ký.
- `GET /api/robots/{robotId}`: thông tin một robot.
- `POST /api/robot/telemetry`: nhận telemetry từ ESP32-S3.
- `GET /api/robot/latest?robotId=AGV-WMS-01`: telemetry mới nhất.
- `WS /ws/robot`: broadcast telemetry realtime.
- `POST /api/robot/task`: gửi task cho robot.
- `GET /api/robot/command?robotId=AGV-WMS-01`: robot poll command.
- `POST /api/robot/ack`: robot phản hồi đã nhận command/task.

## Test không cần ESP32

```powershell
cd ai-server
python robot_telemetry_simulator.py
```

Test robot thứ hai:

```powershell
python robot_telemetry_simulator.py --robot-id AGV-WMS-02 --color BLUE
```

Khi tắt simulator, sau khoảng 5 giây web sẽ chuyển robot sang Offline.

## Lưu ý pin

Nếu ESP32-S3 chưa có mạch đo điện áp pin qua ADC, gửi:

```json
{
  "packVoltage": null,
  "batteryPercent": null,
  "note": "Battery voltage not measured"
}
```

Web sẽ hiển thị `Battery: Unknown`, `Voltage: N/A`, `Battery Percent: N/A`. Chỉ khi có `packVoltage`, web mới ước lượng pin 3S Li-ion theo công thức:

```text
batteryPercent = clamp((packVoltage - 9.0) / (12.6 - 9.0) * 100, 0, 100)
```

Giá trị này luôn được ghi là `Pin ước lượng`.
