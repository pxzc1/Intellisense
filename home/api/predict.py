"""
Vercel Serverless Function - Flower Prediction
Follows the exact model.py prediction logic
"""

import torch
import torch.nn as nn
from torchvision.models import resnet18
from torchvision import transforms
from PIL import Image
import json
from io import BytesIO

# ----------------------
# CONFIG
# ----------------------
MODEL_PTH = "../parameters.pth"      # path to saved model from root
CLASS_JSON = "../class_to_idx.json"  # path to class mapping from root
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ----------------------
# Load class mapping (same as model.py)
# ----------------------
with open(CLASS_JSON, "r") as f:
    class_to_idx = json.load(f)

# Reverse mapping
idx_to_class = {v: k for k, v in class_to_idx.items()}
num_classes = len(idx_to_class)

# ----------------------
# Load model (same as model.py)
# ----------------------
model = resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, num_classes)
model.load_state_dict(torch.load(MODEL_PTH, map_location=DEVICE)["model_state_dict"])
model = model.to(DEVICE)
model.eval()

# ----------------------
# Preprocessing (same as model.py)
# ----------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# ----------------------
# Prediction function (adapted from model.py)
# ----------------------
def predict_image(image_bytes):
    """
    Takes image bytes from frontend and returns prediction
    Follows exact logic from model.py predict_image()
    """
    try:
        # Load image from bytes (instead of file path)
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(DEVICE)

        # Predict (exact same logic as model.py)
        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.softmax(outputs, dim=1)
            conf, pred_idx = torch.max(probs, dim=1)

        pred_class = idx_to_class[pred_idx.item()]
        conf_percent = conf.item() * 100

        return {
            'success': True,
            'prediction': pred_class,
            'confidence': conf_percent
        }

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

# ----------------------
# Vercel Handler
# ----------------------
def handler(request):
    """
    Handle POST requests from frontend
    Returns prediction and confidence
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }

    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'success': False, 'error': 'Method not allowed'}),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }

    try:
        # Get image file from request
        if 'flower_image' not in request.files:
            return {
                'statusCode': 400,
                'body': json.dumps({'success': False, 'error': 'No file uploaded'}),
                'headers': {'Access-Control-Allow-Origin': '*'}
            }

        file = request.files['flower_image']

        if file.filename == '':
            return {
                'statusCode': 400,
                'body': json.dumps({'success': False, 'error': 'No file selected'}),
                'headers': {'Access-Control-Allow-Origin': '*'}
            }

        # Read image bytes
        image_bytes = file.read()

        # Make prediction using model.py logic
        result = predict_image(image_bytes)

        if result['success']:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'success': True,
                    'prediction': result['prediction'],
                    'confidence': result['confidence']
                }),
                'headers': {'Access-Control-Allow-Origin': '*'}
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({'success': False, 'error': result['error']}),
                'headers': {'Access-Control-Allow-Origin': '*'}
            }

    except Exception as e:
        print(f'Handler error: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({'success': False, 'error': str(e)}),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }