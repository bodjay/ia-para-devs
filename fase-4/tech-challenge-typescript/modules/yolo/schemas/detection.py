from pydantic import BaseModel
from typing import List, Optional


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int
    class_name: str


class PoseKeypoint(BaseModel):
    x: float
    y: float
    confidence: float
    name: str


class PersonPose(BaseModel):
    person_id: int
    keypoints: List[PoseKeypoint]
    posture_label: str  # defensive | exercise | neutral | distress


class FrameDetection(BaseModel):
    frame_index: int
    objects: List[BoundingBox]
    person_count: int
    poses: Optional[List[PersonPose]] = None


class ClinicalIndicator(BaseModel):
    name: str
    detected: bool
    confidence: float
    description: str


class ClinicalAnalysis(BaseModel):
    video_type: str  # surgery | physiotherapy | violence_screening | consultation | unknown
    type_confidence: float
    risk_level: str  # low | medium | high | critical
    indicators: List[ClinicalIndicator]
    summary: str


class DetectionResponse(BaseModel):
    frames_processed: int
    frame_detections: List[FrameDetection]
    clinical_analysis: ClinicalAnalysis
    model_version: str = "yolov8n"


class FramesInput(BaseModel):
    frames: List[str]  # base64-encoded JPEG frames
    analysis_type: Optional[str] = None  # surgery | physiotherapy | violence_screening | consultation
