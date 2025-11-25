import json
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
        class_to_idx = data.get("class_to_idx", data)
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
# Preprocessing (pure Python)
# ----------------------
def preprocess(img):
    img = img.resize((224, 224))
    img = img.convert("RGB")
    pixels = list(img.getdata())
    
    # Normalize
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]
    
    # Convert HWC → CHW
    chw = [[], [], []]
    for r, g, b in pixels:
        chw[0].append((r / 255.0 - mean[0]) / std[0])
        chw[1].append((g / 255.0 - mean[1]) / std[1])
        chw[2].append((b / 255.0 - mean[2]) / std[2])

    # Flatten into 1x3x224x224
    tensor = [chw[0], chw[1], chw[2]]
    return [tensor]  # shape: [1,3,224*224] acceptable for ONNX

# ----------------------
# Softmax (pure Python)
# ----------------------
def softmax(logits):
    max_logit = max(logits)
    exps = [pow(2.718281828459045, l - max_logit) for l in logits]
    sum_exps = sum(exps)
    return [e / sum_exps for e in exps]

# ----------------------
# Prediction function
# ----------------------
def predict_image(image_bytes):
    if session is None:
        return {"success": False, "error": "Model failed to load"}

    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(img)

        inputs = {session.get_inputs()[0].name: tensor}
        outputs = session.run(None, inputs)[0][0]  # 1D output

        probs = softmax(list(outputs))
        pred_idx = probs.index(max(probs))
        conf = probs[pred_idx] * 100.0
        pred_class = idx_to_class.get(pred_idx, "Unknown")

        return {"success": True, "prediction": pred_class, "confidence": conf}

    except Exception as e:
        print(f"Prediction error: {e}")
        return {"success": False, "error": str(e)}

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