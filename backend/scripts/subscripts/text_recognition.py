import os
import cv2
import easyocr
import csv
import sys

def process_image(input_folder, output_folder):
    reader = easyocr.Reader(['de', 'en'])
    count = 1

    # Create output folder if it does not exist
    os.makedirs(output_folder, exist_ok=True)
    
    folder_name = os.path.basename(os.path.normpath(input_folder))
    csv_file = os.path.join(output_folder, f"ocr_{folder_name}.csv")
    
    with open(csv_file, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['File', 'Text'])

        for file in os.listdir(input_folder):
            print(f"Processing {file} - {count} of {len(os.listdir(input_folder))}")
            file_full_path = os.path.join(input_folder, file) 

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
    if len(sys.argv) != 3:
        print("Usage: python3 script.py <keyframe_folder> <output_folder>")
    else:
        input_folder = sys.argv[1]
        output_folder = sys.argv[2]
        process_image(input_folder, output_folder)
