import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
from tqdm import tqdm

def draw_landmarks(frame, detection_result):
    """Manually draw pose landmarks and connections using OpenCV."""
    if not detection_result.pose_landmarks:
        return frame
    
    # Pose connections (standard 33 landmarks)
    POSE_CONNECTIONS = [
        (11, 12), (11, 13), (13, 15), (12, 14), (14, 16), # Shoulders & Arms
        (11, 23), (12, 24), (23, 24),                   # Torso
        (23, 25), (25, 27), (27, 31), (24, 26), (26, 28), (28, 32) # Legs
    ]

    h, w, _ = frame.shape
    for pose_landmarks in detection_result.pose_landmarks:
        # Draw Dots
        for idx, landmark in enumerate(pose_landmarks):
            cx, cy = int(landmark.x * w), int(landmark.y * h)
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)

        # Draw Lines
        for connection in POSE_CONNECTIONS:
            start_idx, end_idx = connection
            start = pose_landmarks[start_idx]
            end = pose_landmarks[end_idx]
            cv2.line(frame, 
                     (int(start.x * w), int(start.y * h)), 
                     (int(end.x * w), int(end.y * h)), 
                     (255, 0, 0), 2)
    return frame

def detect_pose(video_path, output_path, model_path='pose_landmarker_lite.task'):
    # Initialize Tasks API
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO
    )

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        for _ in tqdm(range(total_frames), desc="Processando"):
            ret, frame = cap.read()
            if not ret: break

            # Convert BGR to RGB and wrap in mp.Image
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # Tasks require specific timestamps in VIDEO mode
            timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            
            # Detect and Draw
            result = landmarker.detect_for_video(mp_image, timestamp_ms)
            frame = draw_landmarks(frame, result)

            out.write(frame)
            cv2.imshow('Pose Detection', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    out.release()
    cv2.destroyAllWindows()

# Execution
script_dir = os.path.dirname(os.path.abspath(__file__))
# Note: You must download pose_landmarker_lite.task from Google's official site
model_path = os.path.join(script_dir, 'pose_landmarker_lite.task')
detect_pose('../assets/video.mp4', 'output.mp4', model_path)