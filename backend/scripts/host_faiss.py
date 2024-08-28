import subprocess
import sys
import time
import glob

def run_faiss_extraction(image_folder, output_file, image_suffix="jpg"):
    print("Starting FAISS extraction...")
    faiss_command = ["python3", "subscripts/extract_faiss.py", image_folder, output_file, image_suffix]
    result = subprocess.run(faiss_command, capture_output=True)
    if result.returncode != 0:
        print("Error in FAISS extraction:")
        print(result.stderr.decode())
        sys.exit(1)
    print("FAISS extraction completed successfully.")

# Function to run the Node.js server
def start_nodejs_server(image_folder, csv_file):
    print("Starting Node.js server...")
    node_command = ["python3", "subscripts/makeIndexOpenclip.py", image_folder, csv_file]
    process = subprocess.Popen(node_command)
    return process

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 host_faiss.py <keyframe_folder> <output_name> [image_suffix]")
        sys.exit(1)
    
    image_folder = sys.argv[1]
    output_file = sys.argv[2]
    image_suffix = sys.argv[3] if len(sys.argv) > 3 else "jpg"
    
    run_faiss_extraction(image_folder, output_file, image_suffix)
    
    csv_file = glob.glob("*openclip*.csv")[0]

    server_process = start_nodejs_server(image_folder, csv_file)
    
    try:
        while True:
            time.sleep(10) 
    except KeyboardInterrupt:
        print("Shutting down server...")
        server_process.terminate()
