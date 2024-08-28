import os
import subprocess
import sys
import shutil

def run_script(command):
    print(f"Running command: {command}")  # Debug print
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"Error executing: {command}")
        exit(1)
    print(f"Successfully executed: {command}")

def clean_up_directories(*directories):
    for directory in directories:
        if os.path.isdir(directory):
            print(f"Deleting directory: {directory}")
            shutil.rmtree(directory)

def main(video_path, output_dir):
    # 1. Temporal Scene Detection (Extract equidistant frames for each video)
    print("Step 1: Temporal Scene Detection (Extract Frames)")
    run_script(f"python3 subscripts/temporal_scene_detection.py {video_path} {output_dir}/frames")

    # Ensure that the frame output directory exists
    frames_dir = os.path.join(output_dir, "frames")
    if not os.path.exists(frames_dir):
        print(f"Error: Frame output directory does not exist: {frames_dir}")
        exit(1)

    # Iterate over each video folder created by Script 1
    for video_folder in os.listdir(frames_dir):
        video_folder_path = os.path.join(frames_dir, video_folder)

        if not os.path.isdir(video_folder_path):
            print(f"Skipping non-directory: {video_folder_path}")
            continue

        # 2. Text Recognition on the extracted frames for each video
        print(f"Step 2: Text Recognition on Frames for {video_folder}")
        run_script(f"python3 subscripts/text_recognition.py {video_folder_path} {output_dir}/ocr_equidistant")

        # 3. Scene Detection and Keyframe Extraction for each video
        videoname = video_folder.split("_equidistant")[0]
        video_file_path = os.path.join(video_path, videoname + ".mp4")
        
        if not os.path.isfile(video_file_path):
            print(f"Error: Video file not found: {video_file_path}")  # Debug print
            continue

        video_keyframe_output_dir = os.path.join(output_dir, "keyframes", videoname)
        print(f"Step 3: Scene Detection and Keyframe Extraction for {video_folder}")
        run_script(f"python3 subscripts/scene_detection.py {video_file_path} {output_dir}/ocr_equidistant/ocr_{videoname}_equidistant.csv {video_keyframe_output_dir}")

        # 4. Text Recognition on the scene keyframes for each video
        print(f"Step 4: Text Recognition on Keyframes for {video_folder}")
        run_script(f"python3 subscripts/text_recognition.py {video_keyframe_output_dir} {output_dir}/ocr")

        # 5. Speech Detection on keyframes and video for each video
        print(f"Step 5: Speech Recognition for {video_folder}")
        run_script(f"python3 subscripts/speech_recognition.py {video_file_path} {video_keyframe_output_dir} {output_dir}/speech")

    print("All steps completed successfully.")

    # Cleanup directories
    frames_folder = os.path.join(output_dir, "frames")
    ocr_folder = os.path.join(output_dir, "ocr_equidistant")
    clean_up_directories(frames_folder, ocr_folder)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 master_script.py <video_path> <output_dir>")
    else:
        video_path = sys.argv[1]
        output_dir = sys.argv[2]
        main(video_path, output_dir)
