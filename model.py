import os
import json
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision.models import resnet18

# ----------------------------
# Config
# ----------------------------
MODEL_PATH = "model.onnx"        # Path to your trained model
CLASS_TO_IDX_PATH = "class_to_idx.json"   # Path to your class mapping JSON
IMG_DIR = "/path/to/img"                  # Directory or file of images to test
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ----------------------------
# Load class mapping
# ----------------------------
with open(CLASS_TO_IDX_PATH, "r") as f:
    data = json.load(f)
class_to_idx = data["class_to_idx"]
idx_to_class = {v: k for k, v in class_to_idx.items()}

# ----------------------------
# Define model
# ----------------------------
num_classes = len(class_to_idx)
model = resnet18(weights=None)
in_features = model.fc.in_features
model.fc = nn.Linear(in_features, num_classes)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE)["model_state_dict"])
model = model.to(DEVICE)
model.eval()  # Important: set to evaluation mode

# ----------------------------
# Preprocessing transforms
# ----------------------------
transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225])
])

# ----------------------------
# Helper function for prediction
# ----------------------------
def predict_image(img_path):
    try:
        img = Image.open(img_path).convert("RGB")
    except Exception as e:
        print(f"Failed to open image {img_path}: {e}")
        return None, None
    img_tensor = transform(img).unsqueeze(0).to(DEVICE)  # Add batch dim
    with torch.no_grad():
        outputs = model(img_tensor)
        probs = torch.softmax(outputs, dim=1)
        conf, pred_idx = torch.max(probs, dim=1)
    return idx_to_class[pred_idx.item()], conf.item() * 100

# ----------------------------
# Iterate over images
# ----------------------------
if os.path.isdir(IMG_DIR):
    img_files = [os.path.join(IMG_DIR, f) for f in os.listdir(IMG_DIR)
                 if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
elif os.path.isfile(IMG_DIR):
    img_files = [IMG_DIR]
else:
    raise FileNotFoundError(f"No valid file or directory at {IMG_DIR}")

print("Evaluating images...\n")
for img_path in img_files:
    pred_class, confidence = predict_image(img_path)
    if pred_class is not None:
        print(f"{img_path} -> Prediction: {pred_class} ({confidence:.2f}%)")