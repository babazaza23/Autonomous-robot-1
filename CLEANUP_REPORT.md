# Cleanup Report - WMS Robot Tu Hanh

## Ket qua dung luong

- Project goc truoc khi tao ban sach: 2146.70 MB.
- `project_clean/`: 2.97 MB.
- `project_clean.zip`: 2.64 MB.
- Ket qua: giam hon 99%, phu hop de gui ZIP va push GitHub source.

## Audit top file/thu muc nang

| Hang muc | Dung luong | Co nen giu trong repo? | Xu ly |
| --- | ---: | --- | --- |
| `.git/objects/pack/*.pack` | 713.77 MB | Khong copy vao ZIP source | Bo khoi `project_clean`; can rewrite history rieng neu GitHub van bi file lon trong history |
| `ai-server/.venv/` | 1202.97 MB | Khong | Bo khoi `project_clean`, cai lai bang `pip install -r requirements.txt` |
| `ai-server/.venv/.../torch_cpu.dll` | 293.52 MB | Khong | Nam trong virtualenv, bo |
| `ai-server/.venv/.../_polars_runtime.pyd` | 173.88 MB | Khong | Nam trong virtualenv, bo |
| `ai-server/.venv/.../cv2.pyd` | 71.35 MB | Khong | Nam trong virtualenv, bo |
| `node_modules/` | 181.38 MB | Khong | Bo khoi `project_clean`, cai lai bang `npm install` |
| `ai-server/eval_dataset/` | 35.77 MB | Khong nen giu full | Bo full dataset, chi tao README placeholder |
| `dist/` | 3.21 MB | Khong | Build lai bang `npm run build` |
| `ai-server/yolo11n.pt` | 5.35 MB | Khong | De Ultralytics tu tai lan dau hoac dat model ngoai repo |
| `ai-server/frames/` | 0.10 MB | Khong | Runtime frame, bo |
| `ai-server/__pycache__/` | 0.16 MB | Khong | Cache Python, bo |
| `ai-server/vision_metrics_result.csv` | 0.01 MB | Khong | Report generated, bo |
| `ai-server/vision_metrics_summary.json` | 0.00 MB | Khong | Report generated, bo |
| `*.zip` cu | tuy thoi diem | Khong | `.gitignore` chan `*.zip` |

## File/thu muc duoc giu trong `project_clean`

- Frontend source: `src/`, `public/`.
- Frontend config: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`.
- Backend source: `ai-server/main.py`, `webcam_client.py`, `robot_telemetry_simulator.py`.
- Backend dependency/test/evaluation: `requirements.txt`, `test_vision_false_obstacle.py`, `test_path_roi.py`, `evaluate_vision_metrics.py`.
- Tai lieu: `README.md`, `AI_SERVER_README.md`, `ROBOT_TELEMETRY_README.md`, `ai-server/*.md`, `README_CLEAN_PROJECT.md`, `CLEANUP_REPORT.md`.
- Dataset placeholder: `ai-server/eval_dataset/README.md`.

## File/thu muc bi bo khoi ban sach

- `.git/`
- `node_modules/`
- `dist/`, `build/`, `.vite/`
- `.venv/`, `venv/`, `env/`, `ai-server/.venv/`, `ai-server/venv/`, `ai-server/env/`
- `__pycache__/`, `*.pyc`, `*.pyd`
- `ai-server/frames/`, `ai-server/runs/`, `ai-server/logs/`
- `datasets/`, `ai-server/datasets/`, `ai-server/eval_dataset/` full, `ai-server/roboflow/`
- `*.pt`, `*.onnx`, `*.engine`, `*.weights`, `*.bin`, `*.dll`
- `vision_metrics_result.csv`, `vision_metrics_summary.json`
- `*.zip`

## Ly do bo

- Dependency co the cai lai tu lockfile/requirements.
- Build output co the tao lai.
- Runtime frame/cache/log khong phai source.
- Dataset/model la binary lon, khong phu hop repo GitHub source.
- `.git` history co pack rat lon; ban zip source khong can history.

## Cach khoi phuc dependency

Backend:

```powershell
cd ai-server
py -m pip install -r requirements.txt
```

Frontend:

```powershell
npm install
```

## Cach khoi phuc dataset/model

- Dataset full: tu tao lai `ai-server/eval_dataset/` theo `DATASET_GUIDE.md`, `README_AI_VISION_EVALUATION.md`, va `SMALL_BLOCK_DATASET_GUIDE.md`.
- Small blocks: chup cap anh theo `ai-server/SMALL_BLOCK_DATASET_GUIDE.md`.
- YOLO model: khong commit `.pt`; de Ultralytics tu tai `yolo11n.pt` lan dau, hoac dat custom model ngoai repo.
- Neu that su can version model lon trong GitHub, dung Git LFS sau khi thong nhat rieng.

## Cach chay lai project

Backend:

```powershell
cd ai-server
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Webcam:

```powershell
cd ai-server
py webcam_client.py
```

Frontend:

```powershell
npm install
npm run dev
```

Test backend:

```powershell
cd ai-server
py test_vision_false_obstacle.py
py test_path_roi.py
```

## Luu y khi push GitHub

- `.gitignore` da chan dependency, build, dataset, frame runtime, model, zip va report generated.
- Truoc khi push, chay:

```powershell
git status --short
git ls-files | Select-String "node_modules|\\.venv|eval_dataset|\\.pt|\\.zip|dist"
```

- Neu GitHub van bao file >100MB, file lon co the dang nam trong Git history cu. Khi do can rewrite history bang `git filter-repo` hoac tao repo moi tu `project_clean/`.
