import csv
from tracemalloc import start
import cv2
import os
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
import sys

last_saved_frame = None

def save_frame(video_path, frame_number, output_path):
    global last_saved_frame
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(output_path, frame)
        print(f"Saved keyframe to {output_path}")
        last_saved_frame = frame_number
    cap.release()

def text_difference(text1, text2, threshold=0.7):
    words1 = set(text1.split())
    words2 = set(text2.split())
    unique_words = words1.symmetric_difference(words2)
    total_words = words1.union(words2)
    difference_ratio = len(unique_words) / len(total_words)
    return difference_ratio > threshold

def additional_ocr_frames(video_path, video_name, start_frame, end_frame, csv_dir, output_dir, min_frame_distance=50):
    global last_saved_frame
    previous_text = None 

    with open(csv_dir, newline='') as csvfile:
        csv_reader = csv.reader(csvfile)
        next(csv_reader) 
        sorted_rows = sorted(csv_reader, key=lambda row: row[0]) 

    # Process sorted rows
    for row in sorted_rows:
        frame_file = row[0]
        frame = int(frame_file.split('_')[-1].split('.')[0])
        if start_frame < frame < end_frame:
            current_text = row[1]
            if current_text:
                if previous_text is None:
                    previous_text = current_text  
                else:
                    print(f"Comparing OCR text between Frame {frame-1} and Frame {frame}")
                    print(f"Previous text: {previous_text}")
                    print(f"Current text: {current_text}")
                    if text_difference(previous_text, current_text):
                        if last_saved_frame is None or (frame - last_saved_frame) > min_frame_distance:
                            print(f"*Additional OCR frame: {frame} with significant text change")
                            # Save frame
                            output_path = f"{output_dir}/{video_name}_{frame}.jpg"
                            save_frame(video_path, frame, output_path)
                            previous_text = current_text 

def detect_shots_and_extract_keyframes(video_path, output_dir, csv_dir, min_frame_distance=120):
    global last_saved_frame
    video_name = video_path.split('/')[-1].split('.')[0]
    
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=27.0))
    scene_manager.detect_scenes(video, show_progress=True)
    scene_list = scene_manager.get_scene_list()
    
    last_scene_end_frame = 0

    for i, scene in enumerate(scene_list):
        start_frame = scene[0].get_frames()
        end_frame = scene[1].get_frames()
        
        if last_saved_frame is None or (start_frame - last_saved_frame) > min_frame_distance:
            if start_frame + 5 < end_frame:
                start_frame += 5
            print(f"-Scene change detected at Frame {start_frame}")
            output_path = f"{output_dir}/{video_name}_{start_frame}.jpg"
            save_frame(video_path, start_frame, output_path)
        
        print(f"-Processing frames from Frame {start_frame} to Frame {end_frame}")
        additional_ocr_frames(video_path, video_name, start_frame, end_frame, csv_dir, output_dir, min_frame_distance)
        
        last_scene_end_frame = end_frame

    if last_scene_end_frame > 0:
        video_length = int(cv2.VideoCapture(video_path).get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"Last scene ends at Frame {last_scene_end_frame} and video length is {video_length}")
        if last_scene_end_frame < video_length:
            print(f"-Processing remaining frames after last scene from Frame {last_scene_end_frame} to Frame {video_length}")
            additional_ocr_frames(video_path, video_name, last_scene_end_frame, video_length, csv_dir, output_dir, min_frame_distance)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 script.py <video_path> <ocr_csv_path> <output_path>")
    else:
        file_path = sys.argv[1]
        csv_dir = sys.argv[2]
        output_dir = sys.argv[3]
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        detect_shots_and_extract_keyframes(file_path, output_dir, csv_dir)
