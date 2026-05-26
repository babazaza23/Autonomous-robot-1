# Small Block Dataset Guide

## 1. Muc tieu

Thu thap du lieu de test va/hoac train nhan dien vat can nho nhu cube, block, hop nho, khoi go, mo hinh pallet nho trong mo hinh kho WMS Robot Tu Hanh.

## 2. Cach tu chup static obstacle

Tao thu muc:

```text
eval_dataset/small_blocks/static_pairs/
```

Moi cap gom:

```text
bg_block_01.jpg
obstacle_block_01.jpg
```

Trong do:
- `bg_block_01.jpg`: anh nen sach, chua co khoi.
- `obstacle_block_01.jpg`: cung goc camera, them khoi vao vung duong robot.

Khuyen nghi:
- 20 cap toi thieu de test.
- 50 cap de dua vao bao cao.
- Chup bang dung camera/webcam cua robot.

## 3. Cach tu chup moving obstacle

Tao thu muc:

```text
eval_dataset/small_blocks/moving_pairs/
```

Moi cap gom:

```text
before_block_01.jpg
after_block_01.jpg
```

Trong do:
- `before_block_01.jpg`: khoi chua vao vung duong robot hoac o vi tri cu.
- `after_block_01.jpg`: khoi di chuyen vao vung duong robot.

## 4. Bien the can co

- Khoi gan camera.
- Khoi xa camera.
- Khoi nam giua STOP_ROI.
- Khoi nam trong WATCH_ROI.
- Khoi ngoai ROI de test khong bao nham.
- Anh sang manh/yeu.
- Nen sang/toi.
- Nhieu mau: do, xanh, vang, den, trang.
- Khoi bi che mot phan.
- Mot anh co nhieu khoi.
- Goc nhin khac nhau.

## 5. Ground truth cho static small block

```csv
static_block_01,static,small_blocks/static_pairs/obstacle_block_01.jpg,small_blocks/static_pairs/bg_block_01.jpg,true,OBSTACLE_STATIC
```

## 6. Ground truth cho moving small block

```csv
moving_block_01,moving,small_blocks/moving_pairs/after_block_01.jpg,small_blocks/moving_pairs/before_block_01.jpg,true,OBSTACLE_MOVING
```

## 7. Neu muon train YOLO nhan dien khoi nho

Tao:

```text
eval_dataset/small_blocks/yolo_train/images
eval_dataset/small_blocks/yolo_train/labels
```

Khuyen nghi:
- 300-500 anh toi thieu neu train YOLO.
- Neu nhieu class nhu `red_cube`, `blue_cube`, `yellow_cube`, `small_box` thi moi class nen co 100-200 anh.
- Dung Roboflow de annotate bbox.

## 8. Dataset mang de tham khao/train

- Colored Cube Detection tren Roboflow.
- toy_block tren Roboflow.
- Cube Detection tren Roboflow.
- color cubes tren Roboflow.

## 9. Luu y

- Dataset mang tot de train YOLO nhan dien cube/block.
- De test `OBSTACLE_STATIC` bang background calibration, tot nhat phai tu chup cap anh cung goc camera.
- Anh nen sach nen duoc chup ngay truoc khi dat khoi vao STOP_ROI/WATCH_ROI de tranh sai khac anh sang va camera exposure.
