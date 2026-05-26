# AI Server cho ESP32-S3 Camera va WMS React

## 1. Tao moi truong Python

```powershell
cd ai-server
python -m venv .venv
.\.venv\Scripts\activate
```

## 2. Cai thu vien

```powershell
pip install -r requirements.txt
```

Lan dau chay YOLO co the tu tai model nho `yolo11n.pt`.

## 3. Chay server

```powershell
cd ai-server
uvicorn main:app --host 0.0.0.0 --port 8000
```

Server se lang nghe tren cong `8000` cua laptop.

## 4. Lay IP laptop

Tren Windows PowerShell:

```powershell
ipconfig
```

Tim dia chi `IPv4 Address` cua card WiFi, vi du `192.168.1.10`.

## 5. Nhap serverHost trong web WMS

Mo trang Camera trong WMS va nhap:

```text
192.168.1.10:8000
```

Sau do bam Connect. Web se ket noi:

- HTTP: `http://192.168.1.10:8000/api/latest-frame`
- WebSocket: `ws://192.168.1.10:8000/ws/vision`

## 6. ESP32-S3 gui anh

ESP32-S3 chi chup anh JPEG va gui `multipart/form-data` den:

```text
http://<IP_LAPTOP>:8000/api/frame
```

Field anh bat buoc ten la `file`. Co the gui them field `robotId`, vi du `AGV-WMS-01`.

## 7. Test webcam laptop

Khi chua co ESP32-S3, co the gui anh tu webcam laptop len AI Server:

```powershell
cd ai-server
python webcam_client.py
```

Neu khong mo duoc webcam, sua trong `webcam_client.py`:

```python
CAMERA_INDEX = 0  # thu 1 hoac 2 neu may co nhieu camera
```

## 8. Luu y ket noi

- Laptop va ESP32-S3 phai cung WiFi.
- Khong dung MQTT de truyen anh.
- Anh di qua HTTP POST, ket qua realtime di qua WebSocket.
- ESP32-S3 khong xu ly AI nang; laptop server xu ly YOLO/OpenCV.
- Neu Windows Firewall chan cong `8000`, chon `Allow Access` hoac mo cong cho Python/Uvicorn.
