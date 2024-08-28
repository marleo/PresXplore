import sys
import cv2
import os

def extract_frames(video_path, output_path_common, time_interval):
    for file in os.listdir(video_path):
        filename = os.fsdecode(file)
        
        if not filename.endswith(".mp4"):
            continue
        
        video = cv2.VideoCapture(f"{video_path}/{filename}")
        print(f"Extracting frames from {filename}...")
        fps = video.get(cv2.CAP_PROP_FPS)
        frame_count = video.get(cv2.CAP_PROP_FRAME_COUNT)
        duration = frame_count / fps
        
        current_time = 0
        
        output_path = output_path_common + "/" + filename.split(".")[0] + "_equidistant"
        filename_only = filename.split(".")[0]
        
        if not os.path.exists(output_path):
            os.makedirs(output_path)
        
        while current_time < duration:
            frame_number = int(current_time * fps)
            video.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = video.read()
            if ret:
                cv2.imwrite(f"{output_path}/{filename_only}_{frame_number}.jpg", frame)
                print(f"Saved frame {frame_number}")
            current_time += time_interval

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 script.py <video_path> <output_path>")
    else:
        video_path = sys.argv[1]
        output_path = sys.argv[2]
        extract_frames(video_path, output_path, time_interval=5)
