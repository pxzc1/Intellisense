import json
import numpy as np
from PIL import Image
from io import BytesIO
import onnxruntime as ort

# ----------------------
# CONFIG
# ----------------------
MODEL_ONNX = "../../model.onnx"
CLASS_JSON = "../../class_to_idx.json"

# ----------------------
# Load class mapping
# ----------------------
try:
    with open(CLASS_JSON, "r") as f:
        data = json.load(f)
        class_to_idx = data["class_to_idx"] if "class_to_idx" in data else data
except Exception as e:
    print(f"Error loading class_to_idx: {e}")
    class_to_idx = {}

idx_to_class = {v: k for k, v in class_to_idx.items()}
num_classes = len(idx_to_class)

# ----------------------
# Load ONNX model
# ----------------------
try:
    session = ort.InferenceSession(MODEL_ONNX, providers=["CPUExecutionProvider"])
    print("ONNX model loaded successfully")
except Exception as e:
    print(f"Error loading ONNX model: {e}")
    session = None

# ----------------------
# Preprocessing
# ----------------------
def preprocess(img):
    img = img.resize((224, 224))

    img = np.array(img).astype(np.float32) / 255.0

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    img = (img - mean) / std

    img = np.transpose(img, (0, 1, 2))      # HWC → CHW
    img = np.expand_dims(img, axis=0)       # CHW → 1xCHW

    return img.astype(np.float32)

# ----------------------
# Prediction function
# ----------------------
def predict_image(image_bytes):
    if session is None:
        return {
            "success": False,
            "error": "Model failed to load"
        }

    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(img)

        inputs = {session.get_inputs()[0].name: tensor}
        outputs = session.run(None, inputs)[0]

        probs = np.exp(outputs) / np.sum(np.exp(outputs), axis=1, keepdims=True)

        pred_idx = int(np.argmax(probs))
        conf = float(probs[0][pred_idx] * 100.0)

        pred_class = idx_to_class[pred_idx]

        return {
            "success": True,
            "prediction": pred_class,
            "confidence": conf
        }

    except Exception as e:
        print(f"Prediction error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# ----------------------
# Vercel Handler
# ----------------------
def handler(request):
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

        image_bytes = file.read()

        result = predict_image(image_bytes)

        return {
            'statusCode': 200 if result['success'] else 500,
            'body': json.dumps(result),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }

    except Exception as e:
        print(f"Handler error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'success': False, 'error': str(e)}),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }