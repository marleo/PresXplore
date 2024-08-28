# ESOPXplore

ESOPXplore is a lecture video retrieval tool consiting of a suite of scripts for preprocessing videos, two servers to host a FAISS index as well as a NodeJS server and a Angular frontend. 
This project is open-source under the GPL license and welcomes contributions from the community.

![Screen_QueryResults](https://github.com/user-attachments/assets/108c83da-5250-4226-9270-0e525cebd0a4)

## Features
- Automatically generate relevant keyframes from a set of lecture videos.
- Extract text and speech from the keyframes/video and store them in a MongoDB.
- Intuitive Frontend to retrieve video segments/keyframes from certain lectures.
  - You can choose between different query types, depending on your needs (Query for text, speech, videoid, similar keyframes)

## Preprocessing/Keyframe extraction

TODO

## Installation
To install and use ESOPXplore, follow these steps:

1. Clone the repository
```bash
git clone https://github.com/marleo/ESOPXplore.git
```
2. Install required dependencies and execute the scripts
```bash
cd scripts
# Create new environment: python3 -m venv env
python3 setup.py
python3 master_script.py
```
2. Navigate to the backend and start the FAISS and node server
```bash
cd ESOPXplore_server/ESOPXplore_node
npm start
```

```bash
cd ESOPXplore_server/ESOPXplore_faiss
python3 makeIndexVBSopenclip.py {keyframe_root_directory} {faiss_csv_directory}
```
3. Navigate to the frontend directory and start it
```bash
cd ESOPXplore
ng serve
```

## Contributing 
All contributions are welcome! To contribute:

1. Fork the repository
2. Create new branch for your feature or bugfix
3. Submit a pull request

## License
This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](https://github.com/marleo/ESOPXplore/blob/main/LICENSE) file for details.

## Contact
If you have any questions, feel free to open an issue or contact mario_leopold@aau.at
