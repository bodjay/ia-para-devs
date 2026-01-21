import cv2
import os
from tqdm import tqdm

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.python.solutions import drawing_utils
from mediapipe.python.solutions.drawing_utils import landmark_pb2
from mediapipe.python.solutions.pose import pose_connections

# --- MediaPipe Tasks setup ---
MODEL_PATH = "pose_landmarker_lite.task"

BaseOptions = python.BaseOptions
PoseLandmarker = vision.PoseLandmarker
PoseLandmarkerOptions = vision.PoseLandmarkerOptions
VisionRunningMode = vision.RunningMode

def detect_pose(video_path, output_path):
    # Initialize MediaPipe Pose Landmarker
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
        output_segmentation_masks=False
    )

    with PoseLandmarker.create_from_options(options) as pose:
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            print("Erro ao abrir o vídeo.")
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_index = 0

        for _ in tqdm(range(total_frames), desc="Processando vídeo"):
            ret, frame = cap.read()
            if not ret:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            timestamp_ms = int((frame_index / fps) * 1000)
            result = pose.detect_for_video(mp_image, timestamp_ms)

            if result.pose_landmarks:
                for pose_landmarks in result.pose_landmarks:
                    landmark_list = landmark_pb2.NormalizedLandmarkList(
                        landmark=[
                            landmark_pb2.NormalizedLandmark(
                                x=lm.x,
                                y=lm.y,
                                z=lm.z,
                                visibility=lm.visibility
                            )
                            for lm in pose_landmarks
                        ]
                    )

                    drawing_utils.draw_landmarks(
                        frame,
                        landmark_list,
                        pose_connections.POSE_CONNECTIONS
                    )


            out.write(frame)

            cv2.imshow("Video", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            frame_index += 1

        cap.release()
        out.release()
        cv2.destroyAllWindows()


# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
input_video_path = os.path.join(script_dir, '../assets/video.mp4')
output_video_path = os.path.join(script_dir, 'output_video_pose.mp4')

print(input_video_path)
detect_pose(input_video_path, output_video_path)
