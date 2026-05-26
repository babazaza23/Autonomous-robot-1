"""Send frames from the laptop webcam to the WMS AI Vision Server.

Use this when the ESP32-S3 camera is not available.
Run the FastAPI server first:
    uvicorn main:app --host 0.0.0.0 --port 8000
Then run:
    python webcam_client.py
"""

import argparse
import time
import cv2
import requests

SERVER_URL = "http://127.0.0.1:8000/api/frame"
ROBOT_ID = "robot-01"
# Change CAMERA_INDEX to 1 or 2 if your laptop has multiple cameras.
CAMERA_INDEX = 0
SEND_INTERVAL_SECONDS = 0.5  # 2 FPS. Increase to 1.0 if your laptop is slow.
FRAME_WIDTH = 320
FRAME_HEIGHT = 240
JPEG_QUALITY = 80


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default="http://127.0.0.1:8000")
    parser.add_argument("--robot-id", default=ROBOT_ID)
    parser.add_argument("--camera-index", type=int, default=CAMERA_INDEX)
    args = parser.parse_args()
    server_url = f"{args.server.rstrip('/')}/api/frame"

    cap = cv2.VideoCapture(args.camera_index, cv2.CAP_DSHOW)

    if not cap.isOpened():
        print("Không mở được webcam. Thử đổi CAMERA_INDEX = 1 hoặc 2 trong webcam_client.py")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    print("Đang gửi ảnh từ webcam laptop lên AI Server...")
    print(f"POST: {server_url} | robotId={args.robot_id}")
    print("Mở WMS CameraPage và nhập AI Server Host: 127.0.0.1:8000")
    print("Nhấn Ctrl + C để dừng.\n")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Không đọc được frame từ webcam.")
                time.sleep(1)
                continue

            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
            encoded, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])

            if not encoded:
                print("Không encode được JPEG.")
                time.sleep(SEND_INTERVAL_SECONDS)
                continue

            files = {"file": ("webcam.jpg", jpeg.tobytes(), "image/jpeg")}
            data = {"robotId": args.robot_id}

            try:
                response = requests.post(server_url, files=files, data=data, timeout=5)
                if response.ok:
                    payload = response.json()
                    alert = payload.get("alert")
                    detections = payload.get("detections", [])
                    print(f"HTTP 200 | detected={payload.get('detected')} | detections={len(detections)}")
                    if alert:
                        print("ALERT:", alert)
                else:
                    print("HTTP", response.status_code, response.text[:200])
            except requests.RequestException as exc:
                print("POST failed:", exc)

            time.sleep(SEND_INTERVAL_SECONDS)

    except KeyboardInterrupt:
        print("\nĐã dừng webcam client.")
    finally:
        cap.release()


if __name__ == "__main__":
    main()
