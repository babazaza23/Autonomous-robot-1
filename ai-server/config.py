"""Configuration constants for WMS Robot Vision AI Server."""

import os
from pathlib import Path

# Directories
BASE_DIR = Path(__file__).resolve().parent
FRAMES_DIR = BASE_DIR / "frames"
LATEST_FRAME_PATH = FRAMES_DIR / "latest.jpg"

# Default settings
DEFAULT_ROBOT_ID = "robot-01"
MODEL_NAME = os.getenv("YOLO_MODEL_PATH", str(BASE_DIR / "yolo11n.pt"))

# ESP32-S3 / LAN upload safeguards
MAX_FRAME_UPLOAD_BYTES = int(os.getenv("MAX_FRAME_UPLOAD_BYTES", str(2 * 1024 * 1024)))
MAX_WMS_PROOF_IMAGE_BYTES = int(os.getenv("MAX_WMS_PROOF_IMAGE_BYTES", str(2 * 1024 * 1024)))
FRAME_MIN_INTERVAL_MS = int(os.getenv("FRAME_MIN_INTERVAL_MS", "250"))

# Vision detection thresholds
PERSON_CONFIDENCE = 0.35
YOLO_IMAGE_SIZE = 320
SMALL_OBSTACLE_MIN_AREA_RATIO = 0.008
OPENCV_MIN_AREA_RATIO = 0.03
OPENCV_MAX_AREA_RATIO = 0.45
FULL_FRAME_COVERAGE_RATIO = 0.85
WIDE_FRAME_WIDTH_RATIO = 0.85
TALL_FRAME_HEIGHT_RATIO = 0.70

# ROI (Region of Interest) configuration
ROI_X_MIN = 0.15
ROI_X_MAX = 0.85
ROI_Y_MIN = 0.35
PATH_ROI_ENABLED = True

# STOP ROI - where robot must stop
STOP_ROI_X_MIN = 0.30
STOP_ROI_X_MAX = 0.70
STOP_ROI_Y_MIN = 0.45
STOP_ROI_Y_MAX = 1.00
STOP_ROI_MIN_OVERLAP_RATIO = 0.20

# WATCH ROI - where robot monitors for obstacles
WATCH_ROI_X_MIN = 0.20
WATCH_ROI_X_MAX = 0.80
WATCH_ROI_Y_MIN = 0.35
WATCH_ROI_Y_MAX = 1.00
WATCH_ROI_MIN_OVERLAP_RATIO = 0.15

# Clear frame thresholds
CLEAR_FRAME_REQUIRED = 3
PERSON_CLEAR_FRAME_REQUIRED = 5
REQUIRE_BACKGROUND_FOR_STATIC_OBSTACLE = True

# Motion detection thresholds
MOVING_SPEED_THRESHOLD = 35.0
FAST_MOVING_SPEED_THRESHOLD = 90.0

# Tracking parameters
TRACK_MAX_AGE_MS = 1800
TRACK_MATCH_DISTANCE = 140.0

# Turn angle limits for obstacle avoidance
MIN_TURN_ANGLE = 15.0
MAX_TURN_ANGLE = 45.0

# Event labels
EVENT_LABELS = ["PERSON_MOVING", "PERSON_NEAR_PATH", "OBSTACLE_MOVING", "OBSTACLE_STATIC"]

# Create frames directory
FRAMES_DIR.mkdir(parents=True, exist_ok=True)
