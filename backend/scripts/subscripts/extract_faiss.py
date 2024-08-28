import torch
import open_clip
from PIL import Image
import numpy as np
import os
import sys
import glob
import csv

imsuffix = 'png'
if len(sys.argv) < 3:
    print("please specify <folder with images> and <result-filename-no-suffix> [<image-suffix]")
    exit(1)

if len(sys.argv) > 3:
    imsuffix = sys.argv[3]

rootdir = sys.argv[1]

modelname = 'ViT-H-14' #'ViT-L-14' #'ViT-bigG-14' #'ViT-g-14' #'ViT-L-14' #'ViT-B-32' #'ViT-H-14'
modelweights = 'laion2b_s32b_b79k' #'laion400m_e32' #'laion2b_s39b_b160k' #'laion2b_s12b_b42k' #'laion2b_s32b_b82k' #'laion2b_s34b_b79k' #'laion2b_s32b_b79k'

device = "cuda" if torch.cuda.is_available() else "cpu"
model, _, preprocess = open_clip.create_model_and_transforms(modelname, pretrained=modelweights, device=device)

 
csvfile = open(f'openclip-{sys.argv[2]}-{modelname}_{modelweights}.csv','w')
writer = csv.writer(csvfile, delimiter=',')

for filename in glob.iglob(rootdir + f'**/*.{imsuffix}', recursive=True):
    basename = os.path.basename(filename)
    relpath = os.path.relpath(filename, rootdir)
    print(filename)

    image = preprocess(Image.open(filename)).unsqueeze(0).to(device)
    with torch.no_grad():
        image_features = model.encode_image(image)  
        image_features = image_features.cpu()
        mylist = image_features[0].tolist()
        mylist.insert(0, relpath)
        writer.writerow(mylist)

csvfile.close()
