# AI Vision Evaluation Package

Gói này dùng để đánh giá phần AI Vision Server của project WMS Robot Tự Hành.

Mục tiêu đo:

- Tỷ lệ phát hiện đúng người
- Tỷ lệ phát hiện đúng vật cản đứng yên
- Tỷ lệ phát hiện đúng vật cản di chuyển
- Số lần báo nhầm tủ/nền/tường là obstacle
- Thời gian xử lý trung bình mỗi frame
- Độ trễ từ lúc gửi ảnh đến lúc server trả kết quả

## 1. Cấu trúc thư mục đề xuất

Đặt các file trong gói này vào thư mục `ai-server`:

```text
ai-server/
├── main.py
├── evaluate_vision_metrics.py
├── ground_truth_template.csv
├── DATASET_SOURCES.md
└── eval_dataset/
    ├── background/
    ├── person/
    ├── static_obstacle/
    └── moving_obstacle/
```

## 2. Chạy AI Server

PowerShell 1:

```powershell
cd ai-server
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## 3. Chuẩn bị ảnh test

Tạo thư mục:

```powershell
mkdir eval_dataset
mkdir eval_dataset\background
mkdir eval_dataset\person
mkdir eval_dataset\static_obstacle
mkdir eval_dataset\moving_obstacle
```

Bạn cần:

```text
background/        ảnh chỉ có tủ, nền, tường, kệ, không có vật cản mới
person/            ảnh có người
static_obstacle/   cặp ảnh nền sạch + ảnh có vật cản mới đứng yên
moving_obstacle/   cặp ảnh trước chuyển động + sau chuyển động
```

## 4. Tạo ground truth

Copy `ground_truth_template.csv` thành:

```text
eval_dataset/ground_truth.csv
```

Sau đó sửa đường dẫn ảnh trong CSV cho đúng.

Ví dụ:

```csv
id,scenario,image_path,background_path,expected_detected,expected_type
bg_01,background,background/cabinet_01.jpg,,false,
person_01,person,person/person_01.jpg,,true,PERSON_MOVING
static_01,static,static_obstacle/obstacle_01.jpg,static_obstacle/bg_01.jpg,true,OBSTACLE_STATIC
moving_01,moving,moving_obstacle/after_01.jpg,moving_obstacle/before_01.jpg,true,OBSTACLE_MOVING
```

## 5. Chạy đánh giá

PowerShell 2:

```powershell
cd ai-server
py evaluate_vision_metrics.py --manifest eval_dataset/ground_truth.csv --base-dir eval_dataset
```

Nếu server không chạy ở port 8000:

```powershell
py evaluate_vision_metrics.py --server http://localhost:8000 --manifest eval_dataset/ground_truth.csv --base-dir eval_dataset
```

## 6. Kết quả đầu ra

Script sẽ tạo:

```text
vision_metrics_summary.json
vision_metrics_result.csv
```

Terminal sẽ in:

```text
Person accuracy
Static obstacle accuracy
Moving obstacle accuracy
Background false positive count/rate
Average server processing time
Average HTTP roundtrip latency
```

## 7. Cách hiểu kết quả

### Person accuracy

```text
số ảnh có người được phát hiện PERSON_MOVING / tổng ảnh người
```

### Static obstacle accuracy

Với static obstacle, script sẽ:

```text
1. Upload background_path
2. Gọi /api/vision/calibrate-background
3. Upload image_path có vật cản mới
4. Kiểm tra OBSTACLE_STATIC
```

### Moving obstacle accuracy

Với moving obstacle, script sẽ:

```text
1. Upload background_path hoặc frame trước chuyển động
2. Upload image_path hoặc frame sau chuyển động
3. Kiểm tra OBSTACLE_MOVING
```

### Background false positive

```text
ảnh chỉ có tủ/nền/tường nhưng server vẫn báo obstacle
```

Kết quả tốt nhất là:

```text
0 false positive
```

### Processing time

Nếu `main.py` có field:

```json
"performance": {
  "processingTimeMs": 85.4
}
```

script sẽ lấy trực tiếp. Nếu chưa có, script vẫn đo `httpRoundtripMs`, tức thời gian gửi ảnh lên server rồi nhận response.

## 8. Nên test bao nhiêu ảnh?

Tối thiểu để đưa vào báo cáo:

```text
20 ảnh background
20 ảnh person
20 cặp static obstacle
20 cặp moving obstacle
```

Tốt hơn:

```text
50 ảnh/cặp mỗi nhóm
```

## 9. Gợi ý bảng báo cáo

| Chỉ số | Kết quả |
|---|---:|
| Person accuracy | 18/20 = 90% |
| Static obstacle accuracy | 17/20 = 85% |
| Moving obstacle accuracy | 16/20 = 80% |
| Background false positive | 0/20 = 0% |
| Average processing time | 85 ms/frame |
| Average HTTP roundtrip latency | 130 ms |

## 10. Lưu ý quan trọng

Dataset trên mạng chỉ dùng để đánh giá ban đầu. Để kết quả đúng với robot thật, bạn nên tự chụp thêm ảnh bằng chính camera/webcam của robot trong môi trường mô hình kho của bạn.
