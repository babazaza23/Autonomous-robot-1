"""Data models and classes for WMS Robot Vision AI Server."""

import math
from typing import Any

import numpy as np

from config import MOVING_SPEED_THRESHOLD, TRACK_MAX_AGE_MS, TRACK_MATCH_DISTANCE, MIN_TURN_ANGLE, MAX_TURN_ANGLE


class ObjectTracker:
    """Tracks detected objects across frames using centroid matching."""

    def __init__(self) -> None:
        self.next_track_id = 1
        self.tracks: dict[int, dict[str, Any]] = {}

    def update(self, detections: list[dict[str, Any]], timestamp: int) -> list[dict[str, Any]]:
        """Update tracker with new detections and return annotated detections."""
        self._remove_old_tracks(timestamp)

        for detection in detections:
            center = self._center(detection["bbox"])
            matched_id = self._find_match(detection["objectType"], center)
            previous = self.tracks.get(matched_id) if matched_id is not None else None

            if matched_id is None:
                matched_id = self.next_track_id
                self.next_track_id += 1

            motion = self._motion(previous, center, detection["areaRatio"], timestamp)
            if detection.get("sourceDetail") == "opencv_motion" and not motion.get("moving"):
                motion = {
                    **motion,
                    "moving": True,
                    "speedPxPerSec": max(float(motion.get("speedPxPerSec", 0)), MOVING_SPEED_THRESHOLD),
                    "direction": motion.get("direction") if motion.get("direction") != "new" else "motion",
                }
            stable_frames = int(previous.get("stableFrames", 0)) + 1 if previous else 1

            detection["trackId"] = matched_id
            detection["stableFrames"] = stable_frames
            detection["motion"] = motion

            self.tracks[matched_id] = {
                "objectType": detection["objectType"],
                "center": center,
                "areaRatio": detection["areaRatio"],
                "timestamp": timestamp,
                "stableFrames": stable_frames,
            }

        return detections

    def _remove_old_tracks(self, timestamp: int) -> None:
        """Remove tracks that haven't been updated recently."""
        expired = [
            track_id
            for track_id, track in self.tracks.items()
            if timestamp - int(track["timestamp"]) > TRACK_MAX_AGE_MS
        ]
        for track_id in expired:
            self.tracks.pop(track_id, None)

    def _find_match(self, object_type: str, center: tuple[float, float]) -> int | None:
        """Find the closest track of the same type within match distance."""
        best_id: int | None = None
        best_distance = TRACK_MATCH_DISTANCE

        for track_id, track in self.tracks.items():
            if track["objectType"] != object_type:
                continue
            distance = math.dist(center, track["center"])
            if distance < best_distance:
                best_id = track_id
                best_distance = distance

        return best_id

    @staticmethod
    def _center(bbox: dict[str, int]) -> tuple[float, float]:
        """Calculate bbox center."""
        return (bbox["x"] + bbox["w"] / 2, bbox["y"] + bbox["h"] / 2)

    @staticmethod
    def _motion(
        previous: dict[str, Any] | None,
        center: tuple[float, float],
        area_ratio: float,
        timestamp: int,
    ) -> dict[str, Any]:
        """Calculate motion metrics (speed, direction, etc.)."""
        if previous is None:
            return {
                "moving": False,
                "speedPxPerSec": 0.0,
                "dx": 0.0,
                "dy": 0.0,
                "direction": "new",
                "areaDeltaPerSec": 0.0,
            }

        delta_ms = max(timestamp - int(previous["timestamp"]), 1)
        delta_seconds = delta_ms / 1000
        dx = center[0] - float(previous["center"][0])
        dy = center[1] - float(previous["center"][1])
        speed = math.hypot(dx, dy) / delta_seconds
        area_delta = (area_ratio - float(previous["areaRatio"])) / delta_seconds

        if abs(dx) > abs(dy):
            direction = "right" if dx > 0 else "left"
        elif abs(dy) > 0:
            direction = "down" if dy > 0 else "up"
        else:
            direction = "static"

        return {
            "moving": speed >= MOVING_SPEED_THRESHOLD,
            "speedPxPerSec": round(speed, 2),
            "dx": round(dx, 2),
            "dy": round(dy, 2),
            "direction": direction,
            "areaDeltaPerSec": round(area_delta, 4),
        }


class VisionSession:
    """Per-robot vision state and background calibration.
    
    Current project uses one physical robot. robotId is kept to support future
    multi-robot coordination without frame/background/tracker state being shared.
    """

    def __init__(self) -> None:
        self.previous_gray_frame: np.ndarray | None = None
        self.background_gray_frame: np.ndarray | None = None
        self.background_calibrated_at: int | None = None
        self.tracker = ObjectTracker()
        self.safety_state: dict[str, Any] = {
            "suggestedRobotState": "FOLLOW_LINE",
            "lastBlockingType": None,
            "clearFrameCount": 0,
            "lastAlertAt": None,
        }
