import whisper
import sys
import cv2
import os
import csv
import re
import torch

def get_video_framerate(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Error: Unable to open video file {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()
    return fps

def get_keyframe_list(keyframe_path):
    keyframe_list = []
    for file in os.listdir(keyframe_path):
        if file.endswith(".jpg"):
            frame_num = file.split('_')[-1].split('.')[0]
            keyframe_list.append(int(frame_num))
    return sorted(keyframe_list)

def extract_base_filename(video_path):
    return os.path.splitext(os.path.basename(video_path))[0]

def clean_text(text):
    text = re.sub(r'[^\w\säüö]', '', text, flags=re.UNICODE)
    text = re.sub(r'\s+', ' ', text)  
    text = text.strip()
    text = text.replace(" ", ",")
    return text

def save_to_csv(output_dir, keyframe_data, base_filename):
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{base_filename}_speech_results.csv")
    
    with open(output_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['File', 'Text'])
        
        for keyframe, words in keyframe_data.items():
            filename = f"{base_filename}_{keyframe}.jpg"
            text = ', '.join(words)
            cleaned_text = clean_text(text)
            writer.writerow([filename, cleaned_text if cleaned_text else ''])

def speech_recognition(video_path, keyframe_list, video_framerate, output_dir):
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    model = whisper.load_model('medium', device=DEVICE)
    audio = whisper.load_audio(video_path)
    result = model.transcribe(word_timestamps=True, audio=audio)
    
    keyframe_data = {kf: [] for kf in keyframe_list}
    
    for segment in result['segments']:
        for word in segment['words']:
            word_start_ms = word['start'] * 1000 
            
            for i, keyframe in enumerate(keyframe_list):
                keyframe_time_ms = keyframe * (1000 / video_framerate)
                
                if i == len(keyframe_list) - 1:
                    if word_start_ms > keyframe_time_ms:
                        keyframe_data[keyframe].append(word['word']) 
                        break
                else:
                    next_keyframe_time_ms = keyframe_list[i + 1] * (1000 / video_framerate)
                    if keyframe_time_ms < word_start_ms <= next_keyframe_time_ms:
                        keyframe_data[keyframe].append(word['word']) 
                        break
    base_filename = extract_base_filename(video_path)
    save_to_csv(output_dir, keyframe_data, base_filename)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 script.py <video_path> <keyframe_folder> <output_dir>")
    else:
        video_path = sys.argv[1]
        keyframe_path = sys.argv[2]
        output_dir = sys.argv[3]
        keyframe_list = get_keyframe_list(keyframe_path)
        speech_recognition(video_path, keyframe_list, get_video_framerate(video_path), output_dir)
