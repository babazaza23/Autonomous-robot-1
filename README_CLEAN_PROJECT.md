# WMS Robot Tu Hanh - Clean Project Guide

Huong dan nay dung cho ban source sach, khong kem `node_modules`, virtualenv, build output, dataset full, frame runtime, model YOLO nang, cache hoac file zip cu.

## 1. Yeu cau cai dat

- Python 3.10+
- Node.js LTS
- Git
- Webcam neu test camera bang laptop

## 2. Cai backend AI Server

```powershell
cd ai-server
py -m pip install -r requirements.txt
```

## 3. Chay backend

```powershell
cd ai-server
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## 4. Chay webcam client

Mo terminal khac:

```powershell
cd ai-server
py webcam_client.py
```

## 5. Cai va chay frontend

```powershell
npm install
npm run dev
```

## 6. Build frontend

```powershell
npm run build
```

## 7. Test backend

```powershell
cd ai-server
py test_vision_false_obstacle.py
py test_path_roi.py
```

Neu moi clone ve va chua cai dependency backend, hay chay `py -m pip install -r requirements.txt` truoc.

## 8. Calibrate background

Sau khi backend da nhan it nhat mot frame sach:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/vision/calibrate-background
```

## 9. Clear background

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/api/vision/clear-background
```

## 10. Dataset

- `eval_dataset` full khong duoc commit vao repo source.
- Neu muon chay evaluation, tu tao `ai-server/eval_dataset/` theo huong dan trong `DATASET_GUIDE.md`, `README_AI_VISION_EVALUATION.md`, va `SMALL_BLOCK_DATASET_GUIDE.md`.
- Dataset lon nen dat ngoai repo hoac luu bang release/storage rieng.

## 11. Model YOLO

- Khong commit file `.pt`.
- Neu dung Ultralytics YOLO, model `yolo11n.pt` co the tu tai lan dau khi server chay.
- Neu dung custom model, dat model ngoai repo hoac dung Git LFS khi that su can.

## 12. Luu y khi push GitHub

- Khong commit `.venv`, `node_modules`, `dist`, `ai-server/frames`, `ai-server/eval_dataset`, `*.pt`, `*.zip`.
- Kiem tra truoc khi push:

```powershell
git status --short
git ls-files | Select-String "node_modules|\\.venv|eval_dataset|\\.pt|\\.zip"
```
