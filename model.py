from flask import Flask, request, jsonify
import os
import torch
import torch.nn as nn
from PIL import Image
import torchvision.transforms as T
from torchvision.models import resnet18
import json
import re

app = Flask(__name__)

MODEL_PATH = "parameters.pth"
CLASS_IDX_PATH = "class_to_idx.json"

with open(CLASS_IDX_PATH, "r") as f:
    data = json.load(f)
class_to_idx = data["class_to_idx"]
idx_to_class = {v: k for k, v in class_to_idx.items()}

TRANSFORM = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

checkpoint = torch.load(MODEL_PATH, map_location="cpu")

model = resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, len(class_to_idx))
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

softmax = nn.Softmax(dim=1)

@app.route("/predict", methods=["POST"])
def predict():
    if "flower_image" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"})

    file = request.files["flower_image"]
    try:
        img = Image.open(file).convert("RGB")
        img = TRANSFORM(img).unsqueeze(0)

        with torch.no_grad():
            out = model(img)
            probs = softmax(out)
            conf, pred = torch.max(probs, 1)
            pred_class = idx_to_class[pred.item()]
            confidence = conf.item() * 100

        return jsonify({"success": True, "prediction": pred_class, "confidence": confidence})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)