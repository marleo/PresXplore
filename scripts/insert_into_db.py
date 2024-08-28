import pandas as pd
from pymongo import MongoClient
import os
import cv2
import argparse

def extract_frame_numbers(ocr_df):
    return [row['File'].split('_')[-1].split('.')[0] for _, row in ocr_df.iterrows()]

def get_video_info(video_path): 
    video = cv2.VideoCapture(video_path)
    fps = video.get(cv2.CAP_PROP_FPS)
    frame_count = video.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = frame_count / fps
    return fps, frame_count, duration

def process_texts(ocr_df, speech_df, frame_count):
    shots = []
    ocr_map = {row['File']: row['Text'] for _, row in ocr_df.iterrows()}
    speech_map = {row['File']: row['Text'] for _, row in speech_df.iterrows()}

    frame_numbers = sorted(ocr_map.keys(), key=lambda x: int(x.split('_')[-1].split('.')[0]))

    for i, frame in enumerate(frame_numbers):
        framenumber = int(frame.split('_')[-1].split('.')[0])

        next_frames = [int(x.split('_')[-1].split('.')[0]) for x in frame_numbers if int(x.split('_')[-1].split('.')[0]) > framenumber]
        next_frame = min(next_frames) if next_frames else frame_count

        text = ocr_map.get(frame, "")
        speech = speech_map.get(frame, "")

        shot = {
            "from": framenumber,
            "to": next_frame,
            "keyframe": frame,
            "text": clean_word_set(text.split(',') if pd.notna(text) else []),
            "speech": clean_word_set(speech.split(',') if pd.notna(speech) else [])
        }
        shots.append(shot)
        
    return shots

def clean_word_set(word_set): 
    word_set = filter(None, word_set)
    word_set = [word.replace('\n', ' ') for word in word_set]
    return [word.strip() for word in word_set]

def process_csv(video_path, ocr_csv, speech_csv):
    ocr_df = pd.read_csv(ocr_csv)
    speech_df = pd.read_csv(speech_csv)
    
    videoid = video_path.split('/')[-1].split('.')[0]
    fps, frame_count, duration = get_video_info(video_path)
    
    shots = process_texts(ocr_df, speech_df, frame_count)
    
    texts_set = {word for shot in shots for word in shot["text"]}
    speech_set = {word for shot in shots for word in shot["speech"]}

    video_data = {
        "videoid": videoid,
        "fps": fps,
        "shots": shots,
        "duration": duration,
        "texts": clean_word_set(texts_set),
        "speech": clean_word_set(speech_set)
    }
    
    return video_data

def insert_into_mongodb(db_address, db_name, document):
    client = MongoClient(db_address)
    db = client[db_name]
    collection = db['videos'] 
    collection.insert_one(document)

def process_words_and_frames(shots):
    texts_frames = {}
    speech_frames = {}
    for shot in shots:
        frame = shot["keyframe"]
        for word in shot["text"]:
            if word in texts_frames:
                texts_frames[word].append(frame)
            else:
                texts_frames[word] = [frame]
        for word in shot["speech"]:
            if word in speech_frames:
                speech_frames[word].append(frame)
            else:
                speech_frames[word] = [frame]
            
    return texts_frames, speech_frames

def upsert_words_into_mongodb(db_address, db_name, texts_frames, speech_frames):
    client = MongoClient(db_address)
    db = client[db_name]

    # Update texts collection
    collection = db['texts']
    for word, frames in texts_frames.items():
        collection.update_one(
            {"text": word},
            {"$addToSet": {"frames": {"$each": frames}}},
            upsert=True
        )

    # Update speech collection
    collection = db['speech']
    for word, frames in speech_frames.items():
        collection.update_one(
            {"text": word},
            {"$addToSet": {"frames": {"$each": frames}}},
            upsert=True
        )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process video and text data and insert into MongoDB.')
    parser.add_argument('--videopath', required=True, help='Path to the video file.')
    parser.add_argument('--ocr', required=True, help='Path to the OCR CSV file.')
    parser.add_argument('--speech', required=True, help='Path to the speech CSV file.')
    parser.add_argument('--dbname', default='esopxplore', help='Name of the MongoDB database. (optional)(If changed, update the backend API accordingly)')
    parser.add_argument('--dbaddress', default='mongodb://localhost:27017/', help='MongoDB database address. (optional)')

    args = parser.parse_args()

    video_path_args = args.videopath
    ocr_csv_args = args.ocr
    speech_csv_args = args.speech
    db_name = args.dbname
    db_address = args.dbaddress

    for videoid in os.listdir(video_path_args):
        print(f"Processing video: {videoid}")
        videoid = videoid.split('.')[0]
        
        video_path = os.path.join(video_path_args, videoid + ".mp4")
        ocr_csv = os.path.join(ocr_csv_args, f"ocr_{videoid}.csv")
        speech_csv = os.path.join(speech_csv_args, f"{videoid}_speech_results.csv")
        
        video_document = process_csv(video_path, ocr_csv, speech_csv)
        insert_into_mongodb(db_address, db_name, video_document)
        texts_frames, speech_frames = process_words_and_frames(video_document["shots"])
        upsert_words_into_mongodb(db_address, db_name, texts_frames, speech_frames)
