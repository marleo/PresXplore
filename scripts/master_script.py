import os
import subprocess
import argparse

def run_script(command):
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print(f"Error executing: {command}")
        exit(1)
    print(f"Successfully executed: {command}")

def main(video_path, frame_output_dir, keyframe_output_dir, ocr_csv_dir, speech_output_dir):
    # 1. Temporal Scene Detection (Extract equidistant frames for each video)
    print("Step 1: Temporal Scene Detection (Extract Frames)")
    run_script(f"python3 subscripts/temporal_scene_detection.py {video_path} {frame_output_dir}")

    # Iterate over each video folder created by Script 1
    for video_folder in os.listdir(frame_output_dir):
        video_folder_path = os.path.join(frame_output_dir, video_folder)

        if not os.path.isdir(video_folder_path):
            continue  # Skip if it's not a folder

        # 2. Text Recognition on the extracted frames for each video
        print(f"Step 2: Text Recognition on Frames for {video_folder}")
        run_script(f"python3 subscripts/text_recognition.py {video_folder_path}")

        # 3. Scene Detection and Keyframe Extraction for each video
        video_file_path = os.path.join(video_path, f"{video_folder}.mp4")  # Assuming the video file is named after the folder
        video_keyframe_output_dir = os.path.join(keyframe_output_dir, video_folder)

        print(f"Step 3: Scene Detection and Keyframe Extraction for {video_folder}")
        run_script(f"python3 subscripts/scene_detection.py {video_file_path} {ocr_csv_dir} {video_keyframe_output_dir}")

        # 4. Text Recognition on the scene keyframes for each video
        print(f"Step 4: Text Recognition on Keyframes for {video_folder}")
        run_script(f"python3 subscripts/text_recognition.py {video_keyframe_output_dir}")

        # 5. Speech Detection on keyframes and video for each video
        print(f"Step 5: Speech Recognition for {video_folder}")
        run_script(f"python3 subscripts/speech_recognition.py {video_file_path} {video_keyframe_output_dir} {speech_output_dir}")

    print("All steps completed successfully.")

if __name__ == "__main__":
    # Argument parsing
    parser = argparse.ArgumentParser(description="Process videos with scene detection, text recognition, and speech recognition.")
    
    # Add arguments for each required parameter
    parser.add_argument("--video_path", type=str, required=True, help="Path to the folder containing the video files.")
    parser.add_argument("--frame_output_dir", type=str, required=True, help="Directory to save extracted frames.")
    parser.add_argument("--keyframe_output_dir", type=str, required=True, help="Directory to save keyframes from scene detection.")
    parser.add_argument("--ocr_csv_dir", type=str, required=True, help="Directory to store OCR CSV results.")
    parser.add_argument("--speech_output_dir", type=str, required=True, help="Directory for speech recognition results.")

    # Parse the arguments
    args = parser.parse_args()

    # Call the main function with the parsed arguments
    main(
        video_path=args.video_path,
        frame_output_dir=args.frame_output_dir,
        keyframe_output_dir=args.keyframe_output_dir,
        ocr_csv_dir=args.ocr_csv_dir,
        speech_output_dir=args.speech_output_dir
    )

