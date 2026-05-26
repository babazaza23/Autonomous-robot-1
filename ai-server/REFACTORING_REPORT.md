# Refactoring Report: main.py Split into Modules

## Overview
The original `main.py` file (~2084 lines) has been successfully split into a well-organized modular structure. This refactoring improves:
- **Maintainability**: Each module has a single responsibility
- **Testability**: Components can be tested independently
- **Reusability**: Functions can be imported and used elsewhere
- **Clarity**: Code is easier to understand with clear separation of concerns

## New Structure

```
ai-server/
├── config.py                 # Configuration constants (55 lines)
├── models.py                 # Data models: VisionSession, ObjectTracker (145 lines)
├── connection.py             # WebSocket management (32 lines)
├── utils.py                  # Utility functions & global state (80 lines)
├── vision/
│   ├── __init__.py          # Vision module exports
│   ├── detection.py         # YOLO & OpenCV detection (375 lines)
│   ├── tracking.py          # ObjectTracker re-export
│   ├── roi.py              # ROI validation logic (325 lines)
│   └── processing.py       # High-level vision processing (480 lines)
├── robot/
│   ├── __init__.py          # Robot module exports
│   ├── telemetry.py        # Telemetry & registration (75 lines)
│   ├── commands.py         # Command queue management (20 lines)
│   └── fleet.py            # Fleet safety & traffic (70 lines)
├── api/
│   ├── __init__.py          # API route registration
│   ├── vision_routes.py    # Vision endpoints (290 lines)
│   └── robot_routes.py     # Robot endpoints (325 lines)
├── main_new.py              # New FastAPI app entry point (30 lines)
└── main.py                  # Original file (for reference)
```

## Module Descriptions

### Core Modules

#### `config.py` (55 lines)
**Purpose**: Centralized configuration management

**Contents**:
- Directory paths (FRAMES_DIR, LATEST_FRAME_PATH, etc.)
- Model configuration (MODEL_NAME, YOLO_IMAGE_SIZE, etc.)
- Detection thresholds (PERSON_CONFIDENCE, area ratios, etc.)
- ROI boundaries (STOP_ROI, WATCH_ROI coordinates)
- Tracking parameters (TRACK_MAX_AGE_MS, TRACK_MATCH_DISTANCE)
- Motion thresholds (MOVING_SPEED_THRESHOLD, FAST_MOVING_SPEED_THRESHOLD)
- Event labels

#### `models.py` (145 lines)
**Purpose**: Core data structures

**Classes**:
- `ObjectTracker`: Tracks detected objects across frames using centroid matching
- `VisionSession`: Per-robot vision state, background calibration, and tracker instance

**Key Methods**:
- `ObjectTracker.update()`: Updates tracking with new detections
- `ObjectTracker._motion()`: Calculates motion metrics (speed, direction)
- `ObjectTracker._find_match()`: Finds closest track for a detection

#### `connection.py` (32 lines)
**Purpose**: WebSocket connection management

**Classes**:
- `VisionConnectionManager`: Manages WebSocket connections for real-time updates

**Key Methods**:
- `connect()`: Accept and register WebSocket
- `disconnect()`: Remove WebSocket
- `broadcast()`: Send message to all connected clients

#### `utils.py` (80 lines)
**Purpose**: Shared utilities and global state

**Functions**:
- `now_ms()`: Get current timestamp in milliseconds
- `normalize_robot_id()`: Validate and normalize robot IDs
- `get_vision_session()`: Get or create session for robot
- `current_vision_session()`: Get active session
- `safe_robot_filename()`: Convert robot ID to safe filename
- `frame_path_for_robot()`: Get frame file path
- `clamp()`: Clamp value between min and max
- `make_vision_ws_payload()`: Create WebSocket vision payload
- `make_robot_ws_payload()`: Create WebSocket robot payload

**Global State**:
- `vision_sessions_by_robot_id`: Tracks per-robot vision state
- `active_vision_session_robot_id`: Currently active robot ID

### Vision Module

#### `vision/detection.py` (375 lines)
**Purpose**: Object detection using YOLO and OpenCV

**Functions**:
- `get_model()`: Load and cache YOLO model
- `create_detection()`: Create standardized detection object
- `detect_people_by_yolo()`: YOLO-based person detection
- `background_difference_candidates()`: Detect static obstacles via background subtraction
- `frame_difference_candidates()`: Detect moving obstacles via frame difference
- `detect_obstacle_by_opencv()`: Main OpenCV detection pipeline
- `merge_candidate_boxes()`: Filter and sort candidates

#### `vision/roi.py` (325 lines)
**Purpose**: ROI validation and geometry calculations

**Functions**:
- `path_roi_config()`: Get ROI configuration
- `get_roi_rect()`: Calculate ROI rectangle in pixels
- `bbox_overlap_ratio()`: Calculate overlap between bbox and ROI
- `center_in_roi()`: Check if point is inside ROI
- `validate_path_zones()`: Validate bbox against STOP/WATCH ROIs
- `validate_path_roi()`: Validate bbox for path checking
- `validate_obstacle_bbox()`: Comprehensive obstacle bbox validation

**Key Validations**:
- Size checks (too small, too large)
- Frame coverage checks
- Edge touching checks
- Path ROI compliance
- Background calibration requirements

#### `vision/processing.py` (480 lines)
**Purpose**: High-level vision processing and event classification

**Functions**:
- `detect_objects()`: Main detection pipeline (YOLO → OpenCV → Tracking → Classification)
- `classify_event_labels()`: Convert detections to actionable events
- `create_alert()`: Select highest-priority alert
- `update_vision_safety_state()`: Update robot safety state
- `estimate_turn_action()`: Calculate obstacle avoidance turn
- `bbox_iou()`: Calculate Intersection over Union
- `overlaps_blocking_person()`: Check if obstacle overlaps person
- `safety_state_snapshot()`: Create safety state snapshot
- `empty_result()`: Create empty detection result
- `empty_performance()`: Create empty performance metrics
- `empty_latency()`: Create empty latency metrics

#### `vision/tracking.py` (10 lines)
**Purpose**: Re-export tracking functionality

Re-exports `ObjectTracker` from `models.py` for consistency with package organization.

### Robot Module

#### `robot/telemetry.py` (75 lines)
**Purpose**: Robot registration and telemetry management

**Functions**:
- `register_robot_if_needed()`: Register robot if not already registered
- `robot_online()`: Check if robot is online based on recent telemetry
- `enrich_robot()`: Add runtime information to robot data
- `extract_robot_pose()`: Extract pose from telemetry

**Global State**:
- `registered_robots`: Dict of all registered robots
- `latest_robot_telemetry_by_id`: Latest telemetry per robot

#### `robot/commands.py` (20 lines)
**Purpose**: Command queue management

**Functions**:
- `append_command()`: Add command to robot's queue

**Global State**:
- `robot_command_queues_by_id`: Command queues per robot

#### `robot/fleet.py` (70 lines)
**Purpose**: Fleet-level safety and traffic management

**Functions**:
- `update_fleet_safety()`: Update fleet safety based on robot telemetry

**Global State**:
- `traffic_state`: Fleet traffic and reservation state

### API Module

#### `api/vision_routes.py` (290 lines)
**Purpose**: Vision-related REST and WebSocket endpoints

**Endpoints**:
- `GET /` - Health check with configuration
- `POST /api/vision/calibrate-background` - Calibrate background
- `POST /api/vision/clear-background` - Clear calibration
- `GET /api/vision/background-status` - Get calibration status
- `POST /api/frame` - Receive frame and process vision
- `GET /api/latest-frame` - Get latest frame image
- `GET /api/latest-result` - Get latest detection result
- `WS /ws/vision` - WebSocket for vision updates

#### `api/robot_routes.py` (325 lines)
**Purpose**: Robot management REST and WebSocket endpoints

**Endpoints**:
- `POST /api/robots` - Register robot
- `GET /api/robots` - List robots
- `GET /api/robots/{robot_id}` - Get robot info
- `GET /api/robots/{robot_id}/latest-result` - Get latest vision result
- `GET /api/robots/{robot_id}/latest-frame` - Get latest frame
- `GET /api/robots/{robot_id}/telemetry/latest` - Get latest telemetry
- `GET /api/robots/{robot_id}/command` - Get pending command
- `POST /api/robots/{robot_id}/task` - Create task
- `POST /api/robot/telemetry` - Receive telemetry
- `GET /api/robot/latest` - Get latest telemetry
- `POST /api/robot/task` - Create task
- `GET /api/robot/command` - Poll commands
- `POST /api/robot/ack` - Acknowledge command
- `WS /ws/robot` - WebSocket for robot updates

#### `api/__init__.py`
**Purpose**: API module initialization

**Functions**:
- `register_routes()`: Register all vision and robot routes

### Entry Point

#### `main_new.py` (30 lines)
**Purpose**: FastAPI application initialization

**Contents**:
- FastAPI app creation
- CORS middleware configuration
- Frames directory initialization
- Route registration

## Migration Guide

### From Old to New

**Before**:
```python
from main import detect_objects, validate_path_roi
```

**After**:
```python
from vision.processing import detect_objects
from vision.roi import validate_path_roi
```

### Backward Compatibility

The old `main.py` can be gradually phased out. For now:
1. Keep `main.py` as reference
2. Use `main_new.py` as the new entry point
3. Update imports gradually throughout the codebase

## Benefits of This Structure

### 1. **Separation of Concerns**
- Configuration is isolated in `config.py`
- Vision logic is in `vision/` module
- Robot management is in `robot/` module
- API layer is in `api/` module

### 2. **Better Testability**
- Each component can be tested independently
- No circular dependencies
- Mock objects can be easily injected

### 3. **Easier Maintenance**
- Bug fixes are localized to relevant modules
- Adding new features is straightforward
- Code review is simplified with smaller files

### 4. **Improved Performance**
- Lazy imports reduce startup time
- Unused modules don't need to be loaded

### 5. **Scalability**
- Easy to add new detection methods in `vision/`
- Robot modules can be extended for multi-robot coordination
- API can be extended with new endpoints

## Next Steps

1. **Update main.py** → Replace with `main_new.py` content and rename
2. **Update imports** → Change import statements throughout codebase
3. **Add tests** → Create test files for each module
4. **Documentation** → Add docstrings to all functions
5. **CI/CD** → Update build process if needed

## Statistics

| Module | Lines | Purpose |
|--------|-------|---------|
| config.py | 55 | Configuration |
| models.py | 145 | Core data structures |
| connection.py | 32 | WebSocket management |
| utils.py | 80 | Utilities & state |
| vision/detection.py | 375 | Detection pipeline |
| vision/roi.py | 325 | ROI validation |
| vision/processing.py | 480 | Event classification |
| vision/tracking.py | 10 | Tracking |
| robot/telemetry.py | 75 | Telemetry |
| robot/commands.py | 20 | Commands |
| robot/fleet.py | 70 | Fleet safety |
| api/vision_routes.py | 290 | Vision endpoints |
| api/robot_routes.py | 325 | Robot endpoints |
| main_new.py | 30 | App entry point |
| **Total** | **2,308** | **14 files** |

*Note*: Original main.py was ~2,084 lines. New structure is ~2,308 lines (includes module overhead like imports, docstrings, and structure), which is a reasonable trade-off for improved maintainability and clarity.
