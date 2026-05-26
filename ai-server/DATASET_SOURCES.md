# Dataset Sources cho AI Vision Evaluation

## 1. Phát hiện người: COCO 2017 val

Nguồn:

```text
https://cocodataset.org/
```

Dùng để test:

```text
PERSON_MOVING
```

Cách dùng:

```text
1. Tải COCO val2017.
2. Chọn ảnh có người.
3. Copy 20-50 ảnh vào eval_dataset/person.
4. Thêm vào ground_truth.csv với expected_type=PERSON_MOVING.
```

Ví dụ:

```csv
person_01,person,person/000000000785.jpg,,true,PERSON_MOVING
```

## 2. Người/vật thể quy mô lớn: Open Images V7

Nguồn:

```text
https://storage.googleapis.com/openimages/web/index.html
```

Dùng để test:

```text
PERSON_MOVING
OBSTACLE_STATIC nếu chọn ảnh có box/container/cart/chair
```

Lưu ý:

```text
Dataset rất lớn, không tải toàn bộ. Chỉ lấy subset nhỏ các class cần thiết.
```

## 3. Vật cản di chuyển: CDnet 2014 / ChangeDetection.net

Nguồn:

```text
https://jacarini.dinf.usherbrooke.ca/dataset2014/
```

Dùng để test:

```text
OBSTACLE_MOVING
```

Cách dùng:

```text
1. Tải một vài video/category nhỏ.
2. Lấy 2 frame liên tiếp hoặc cách nhau vài frame.
3. Frame trước là background_path.
4. Frame sau là image_path.
5. expected_type=OBSTACLE_MOVING.
```

Ví dụ:

```csv
moving_01,moving,moving_obstacle/after_01.jpg,moving_obstacle/before_01.jpg,true,OBSTACLE_MOVING
```

## 4. Background indoor để test false positive: Places365

Nguồn:

```text
https://places2.csail.mit.edu/
```

Dùng để test:

```text
background false positive
```

Chọn ảnh indoor như:

```text
corridor
storage room
warehouse
garage
office
bedroom
living room
kitchen
```

Ví dụ:

```csv
bg_01,background,background/corridor_01.jpg,,false,
```

## 5. Dataset warehouse/obstacle thực tế: Roboflow Universe

Trang tổng hợp:

```text
https://universe.roboflow.com/browse/logistics/warehouse
```

Một số nhóm phù hợp:

```text
Warehouse obstacle detection
Warehouse objects
Indoor Obstacle Detection
Pallet / Box / Package Detection
```

Lưu ý:

```text
Một số dataset cần đăng nhập Roboflow hoặc API key.
Nếu dùng ảnh có sẵn vật thể nhưng không có ảnh nền tương ứng, không phù hợp để test static background calibration.
```

## 6. Warehouse robot synthetic dataset: Synapse Open Dataset

Nguồn:

```text
https://zenodo.org/records/11459539
```

Dùng để lấy thêm ảnh môi trường kho synthetic.

## 7. Khuyến nghị

Bộ test tốt nhất cho project:

```text
- 20 ảnh người từ COCO/Open Images
- 20 ảnh background indoor từ Places365 hoặc tự chụp
- 20 cặp background/obstacle tự chụp bằng camera robot
- 20 cặp motion tự chụp hoặc lấy từ CDnet
```

Phần static obstacle nên ưu tiên tự chụp vì server của bạn dùng background calibration, cần cùng góc camera.
