# Deprecated: khong can train dataset cho demo hien tai

Phien ban AI Vision Server hien tai chay theo che do `no-training`:

- Khong tao `data.yaml`.
- Khong train YOLO custom.
- Khong dung `best.pt`.
- Van dung `yolo11n.pt` pretrained de phat hien `person`.
- Dung OpenCV contour/frame-difference/ROI de phat hien vat can.
- Dung tracking bbox giua nhieu frame de phan biet vat can moving/static.

Luồng dung cho demo:

```text
ESP32-S3 Camera -> POST /api/frame -> FastAPI YOLO/OpenCV -> WS /ws/vision -> React WMS
```

Neu sau nay muon train model rieng, hay tao tai lieu moi rieng biet. Tai lieu nay duoc giu lai chi de nhac rang pipeline hien tai khong yeu cau dataset rieng.
