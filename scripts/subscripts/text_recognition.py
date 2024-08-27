import os
import cv2
import easyocr
import csv
import sys

def process_image(file_path):
    reader = easyocr.Reader(['de', 'en'])
    count = 1
    
    csv_file = f"ocr_{file_path}.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['File', 'Text'])

        for file in os.listdir(file_path):
            print(f"Processing {file} - {count} of {len(os.listdir(file_path))}")
            file_full_path = os.path.join(file_path, file) 

            image = cv2.imread(file_full_path)
            if image is None:
                print(f"Error: Unable to open image {file}")
                continue
            
            result = reader.readtext(file_full_path, detail=0, batch_size=10)
            
            formatted_text = ', '.join([word for line in result for word in line.split()])
            csv_writer.writerow([file, formatted_text])

            count += 1

    print(f"CSV file saved as: {csv_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 script.py <image_folder>")
    else:
        file_path = sys.argv[1]
        process_image(file_path)
