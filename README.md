# PresXplore 🔎

PresXplore is a lecture video retrieval tool consiting of a suite of scripts for preprocessing videos, two servers to host a FAISS index as well as a NodeJS server and a Angular frontend. 
This project is open-source under the GPL license and welcomes contributions from the community.

![Screen_QueryResults](https://github.com/user-attachments/assets/108c83da-5250-4226-9270-0e525cebd0a4)

## Features ✨
- Automatically generate relevant keyframes from a set of lecture videos.
- Extract text and speech from the keyframes/video and store them in a MongoDB.
- Intuitive Frontend to retrieve video segments/keyframes from certain lectures.
  - You can choose between different query types, depending on your needs (Query for text, speech, videoid, similar keyframes)
 
## Prerequisites 📋
- Ensure you have Python 3.x installed.
- Videos have to be in a folder and in the .mp4 format.
- Be sure to install necessary libraries and tools. (should be handled by _setup.py_)

## Preprocessing/Keyframe extraction 🎥

```bash
cd backend/scripts
#python3 -m venv env
#Installing dependencies
python3 setup.py
#Perform OCR and ASR recognition, as well as shot-detection
python3 process_videos.py <video_folder_path> <output_folder_path>
#Insert the generated csv's into a MongoDB (has to be started beforehand)
python3 insert_into_db.py --videopath <video_folder_path> --ocr <ocr_folder_path (created by process_videos.py)> --speech <speech_folder_path (created by process_videos.py)> 
```

## Starting backend/frontend 🚀
**Backend:**
1. Start the FAISS server:
```bash
cd backend/scripts
#Generate and host the FAISS index
python3 host_faiss <keyframe_folder_path> <indexfile_name> 
``` 
2. Create local-config.ts in backend root folder. (Refer to the local-config-example.ts for guidance)
3. Start the backend:
```bash
cd backend
npm i
npm start
```

**Frontend:**
1. Create local-config.ts located in frontend/src/app/shared/config. (Refer to the local-config-example.ts for guidance)
2. Start the frontend:
```bash
cd frontend
npm i
ng serve
```

Additionally, you need to host the keyframes to display them in the frontend. A simple solution if you want to host them locally is to simply use python:
```bash
python3 -m http.server
```
 
## Contributing 🤝
All contributions are welcome! To contribute:

1. Fork the repository
2. Create new branch for your feature or bugfix
3. Submit a pull request

## License 📜
This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](https://github.com/marleo/ESOPXplore/blob/main/LICENSE) file for details.

## Contact 📧
If you have any questions, feel free to open an issue or contact mario_leopold@aau.at
