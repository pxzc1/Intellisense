import torch
import torch.nn as nn
from torchvision.models import resnet18
from torchvision import transforms
from PIL import Image
import json
import os

# ----------------------
# CONFIG
# ----------------------
MODEL_PTH = "parameters.pth"          # your saved model
CLASS_JSON = "class_to_idx.json"           # mapping file
IMAGE_PATH = "imgs.jpg"            # this image will be pass from frontend likely from api-client.js and then predict.py -> model.py -> predict.py -> api-client.js for response
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ----------------------
# Load class mapping
# ----------------------
with open(CLASS_JSON, "r") as f:
    class_to_idx = json.load(f)

# Reverse mapping
idx_to_class = {v: k for k, v in class_to_idx.items()}
num_classes = len(idx_to_class)

# ----------------------
# Load model
# ----------------------
model = resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, num_classes)
model.load_state_dict(torch.load(MODEL_PTH, map_location=DEVICE)["model_state_dict"])
model = model.to(DEVICE)
model.eval()

# ----------------------
# Preprocessing
# ----------------------
transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

# ----------------------
# Prediction function
# ----------------------
def predict_image(img_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    img = Image.open(img_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1)
        conf, pred_idx = torch.max(probs, dim=1)

    pred_class = idx_to_class[pred_idx.item()]
    conf_percent = conf.item() * 100

    print(f"Image: {img_path}")
    print(f"Prediction: {pred_class} ({conf_percent:.2f}%)")

# ----------------------
# Run
# ----------------------
predict_image(IMAGE_PATH)