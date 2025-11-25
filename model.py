import os
import torch
import torch.nn as nn
from PIL import Image
import torchvision.transforms as T
from torchvision.models import resnet18
import json
import re

MODEL_PATH = "parameters.pth"
IMG_DIR = "imgs"
CLASS_IDX_PATH = "class_to_idx.json"

with open(CLASS_IDX_PATH,"r") as f:
    data = json.load(f)
class_to_idx = data["class_to_idx"]
idx_to_class = {v:k for k,v in class_to_idx.items()}

TRANSFORM = T.Compose([
    T.Resize((224,224)),
    T.ToTensor(),
    T.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

checkpoint = torch.load(MODEL_PATH, map_location="cpu")

model = resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, len(class_to_idx))
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

files = sorted([f for f in os.listdir(IMG_DIR) if f.lower().endswith((".png",".jpg",".jpeg",".webp"))])

correct = 0
total = 0
softmax = nn.Softmax(dim=1)

for name in files:
    path = os.path.join(IMG_DIR, name)
    img = Image.open(path).convert("RGB")
    img = TRANSFORM(img).unsqueeze(0)

    with torch.no_grad():
        out = model(img)
        probs = softmax(out)
        conf, pred = torch.max(probs, 1)
        pred_class = idx_to_class[pred.item()]
        confidence = conf.item() * 100

    true_class = re.sub(r'[^a-zA-Z]', '', os.path.splitext(name)[0]).lower()

    if true_class == pred_class.lower():
        correct += 1
    total += 1

    print(f"{name} -> {pred_class} ({confidence:.2f}%)")

if total > 0:
    acc = correct / total * 100
    print(f"\nOverall Accuracy: {acc:.2f}%")