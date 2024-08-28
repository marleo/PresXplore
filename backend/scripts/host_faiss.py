import subprocess
import sys
import time

# Function to run the FAISS extraction script
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
def start_nodejs_server(keyframe_base_root, csv_file):
    print("Starting Node.js server...")
    node_command = ["python3", "subscripts/makeIndexOpenclip.py", keyframe_base_root, csv_file]
    process = subprocess.Popen(node_command)
    return process

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 host_faiss.py <image_folder> <output_file> <keyframe_base_root> [image_suffix]")
        sys.exit(1)
    
    # Get command-line arguments
    image_folder = sys.argv[1]
    output_file = sys.argv[2]
    keyframe_base_root = sys.argv[3]
    image_suffix = sys.argv[4] if len(sys.argv) > 4 else "jpg"
    
    # Step 1: Run FAISS extraction
    run_faiss_extraction(image_folder, output_file, image_suffix)
    
    # Step 2: Start the Node.js server
    server_process = start_nodejs_server(keyframe_base_root, output_file)
    
    try:
        while True:
            time.sleep(10)  # Keep the script alive while the server is running
    except KeyboardInterrupt:
        print("Shutting down server...")
        server_process.terminate()
