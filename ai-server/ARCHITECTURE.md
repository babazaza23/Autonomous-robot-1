# Module Organization & Dependency Map

## Package Structure (Visual)

```
ai-server/
│
├─ 📄 config.py ...................... Configuration constants
│
├─ 📄 models.py ...................... Core data classes
│  └─ VisionSession, ObjectTracker
│
├─ 📄 connection.py .................. WebSocket management
│  └─ VisionConnectionManager
│
├─ 📄 utils.py ....................... Utilities & global state
│  ├─ Helper functions
│  └─ Global state (sessions, active robot)
│
├─ 📁 vision/ ........................ Vision processing module
│  ├─ __init__.py ................... Module exports
│  ├─ detection.py .................. YOLO & OpenCV
│  │  ├─ get_model()
│  │  ├─ detect_people_by_yolo()
│  │  └─ detect_obstacle_by_opencv()
│  ├─ roi.py ........................ ROI validation
│  │  ├─ validate_path_zones()
│  │  ├─ validate_obstacle_bbox()
│  │  └─ bbox_overlap_ratio()
│  ├─ processing.py ................. Event classification
│  │  ├─ detect_objects() .......... MAIN PIPELINE
│  │  ├─ classify_event_labels()
│  │  ├─ create_alert()
│  │  └─ update_vision_safety_state()
│  └─ tracking.py ................... Tracker (re-export)
│
├─ 📁 robot/ ......................... Robot management module
│  ├─ __init__.py ................... Module exports
│  ├─ telemetry.py .................. Telemetry & registration
│  │  ├─ registered_robots
│  │  └─ latest_robot_telemetry_by_id
│  ├─ commands.py ................... Command queue
│  │  └─ robot_command_queues_by_id
│  └─ fleet.py ...................... Fleet safety
│     └─ traffic_state
│
├─ 📁 api/ .......................... FastAPI routes module
│  ├─ __init__.py ................... Route registration
│  ├─ vision_routes.py .............. Vision endpoints
│  │  ├─ GET /
│  │  ├─ POST /api/frame
│  │  ├─ GET /api/latest-frame
│  │  ├─ POST /api/vision/calibrate-background
│  │  └─ WS /ws/vision
│  └─ robot_routes.py .............. Robot endpoints
│     ├─ POST /api/robots
│     ├─ GET /api/robots
│     ├─ POST /api/robot/telemetry
│     ├─ GET /api/robot/command
│     └─ WS /ws/robot
│
└─ 📄 main_new.py ................... FastAPI app entry point
   └─ Creates app, adds middleware, registers routes


## Dependency Flow

```
config.py (no dependencies)
    ↓
models.py ← config, utils
    ↓
connection.py (minimal dependencies)
    ↓
utils.py ← config, models
    ↓
vision/
    ├─ detection.py ← config, utils, roi
    ├─ roi.py ← config, utils
    ├─ processing.py ← config, utils, detection, roi
    └─ tracking.py → models
        ↓
robot/
    ├─ telemetry.py ← config, utils
    ├─ commands.py ← config, utils
    └─ fleet.py ← utils, telemetry, commands
        ↓
api/
    ├─ vision_routes.py ← config, utils, connection, detection, processing
    └─ robot_routes.py ← config, utils, connection, telemetry, commands, fleet
        ↓
main_new.py ← fastapi, config, api
```

## Data Flow

```
1. FRAME INTAKE
   POST /api/frame → api/vision_routes.py::receive_frame()
   
2. VISION PROCESSING
   image → vision/processing.py::detect_objects()
   ├─ YOLO detection → vision/detection.py::detect_people_by_yolo()
   ├─ OpenCV detection → vision/detection.py::detect_obstacle_by_opencv()
   ├─ Tracking → models.py::ObjectTracker.update()
   ├─ Classification → vision/processing.py::classify_event_labels()
   └─ Safety state → vision/processing.py::update_vision_safety_state()

3. RESULT BROADCASTING
   result → api/vision_routes.py::manager.broadcast()
   └─ WS /ws/vision ← connected clients

4. TELEMETRY INTAKE
   POST /api/robot/telemetry → api/robot_routes.py::receive_robot_telemetry()
   
5. FLEET SAFETY
   telemetry → robot/fleet.py::update_fleet_safety()
   ├─ Check zone conflicts
   ├─ Update traffic state
   └─ Queue safety commands

6. COMMAND DISPATCH
   GET /api/robot/command → api/robot_routes.py::poll_robot_command()
   ← pop from robot/commands.py::robot_command_queues_by_id
```

## Global State Distribution

```
config.py
├─ MODEL_NAME, PERSON_CONFIDENCE, etc. (constants)

utils.py
├─ vision_sessions_by_robot_id
└─ active_vision_session_robot_id

robot/telemetry.py
├─ registered_robots
└─ latest_robot_telemetry_by_id

robot/commands.py
└─ robot_command_queues_by_id

robot/fleet.py
└─ traffic_state

api/vision_routes.py
├─ manager (WebSocket)
├─ latest_vision_results_by_robot_id
└─ latest_frame_paths_by_robot_id

api/robot_routes.py
├─ robot_manager (WebSocket)
└─ robot_tasks_by_id
```

## Module Communication

### Cross-Module Function Calls

```
vision/processing.py::detect_objects()
├─ calls: vision/detection.py::detect_people_by_yolo()
├─ calls: vision/detection.py::detect_obstacle_by_opencv()
├─ calls: models.py::ObjectTracker.update()
├─ calls: vision/processing.py::classify_event_labels()
└─ calls: vision/processing.py::update_vision_safety_state()

api/robot_routes.py::receive_robot_telemetry()
├─ calls: robot/telemetry.py::register_robot_if_needed()
├─ calls: robot/fleet.py::update_fleet_safety()
└─ calls: robot/telemetry.py::enrich_robot()

api/vision_routes.py::receive_frame()
├─ calls: robot/telemetry.py::register_robot_if_needed()
├─ calls: vision/processing.py::detect_objects()
└─ calls: connection.py::VisionConnectionManager.broadcast()
```

## Import Organization

### Level 1 (No Internal Dependencies)
```python
config.py
connection.py
```

### Level 2 (Depends on Level 1)
```python
utils.py → config
models.py → config, utils
```

### Level 3 (Depends on Level 1-2)
```python
vision/roi.py → config, utils
vision/detection.py → config, utils, vision/roi
vision/processing.py → config, utils, vision/detection, vision/roi
```

### Level 4 (Robot Management)
```python
robot/telemetry.py → config, utils
robot/commands.py → config, utils
robot/fleet.py → utils, robot/telemetry, robot/commands
```

### Level 5 (API Layer)
```python
api/vision_routes.py → everything in vision, robot/telemetry, utils, connection
api/robot_routes.py → everything in robot, utils, connection
```

### Level 6 (Entry Point)
```python
main_new.py → fastapi, config, api
```

## Testing Strategy

### Unit Tests
```
tests/
├─ test_models.py ..................... ObjectTracker, VisionSession
├─ test_utils.py ...................... Helper functions
├─ test_vision_detection.py ........... YOLO, OpenCV, create_detection
├─ test_vision_roi.py ................. ROI validation
├─ test_vision_processing.py .......... classify_event_labels, create_alert
├─ test_robot_telemetry.py ............ Robot registration, enrichment
├─ test_robot_commands.py ............. Command queue
└─ test_robot_fleet.py ................ Fleet safety logic
```

### Integration Tests
```
tests/
├─ test_vision_pipeline.py ............ Full detect_objects() pipeline
├─ test_robot_management.py ........... Robot lifecycle
└─ test_api_endpoints.py .............. All REST endpoints
```

## Performance Considerations

### Module Load Time
- `config.py` - ~1ms (constants only)
- `models.py` - ~5ms (class definitions)
- `utils.py` - ~5ms (helper functions)
- `vision/` - ~100ms (imports numpy, cv2, yolo)
- `robot/` - ~5ms (lightweight)
- `api/` - ~10ms (route definitions)

### Memory Usage
- `ObjectTracker.tracks` - O(n) where n = number of active objects
- `latest_robot_telemetry_by_id` - O(m) where m = number of robots
- `vision_sessions_by_robot_id` - O(m) + background frames per robot

### Optimization Tips
1. Load YOLO model lazily (already done)
2. Cache ROI calculations if needed
3. Consider thread-safe operations for concurrent requests
4. Use connection pooling for external services
