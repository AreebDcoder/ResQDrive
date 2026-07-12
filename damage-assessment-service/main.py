# main.py
import io
import time
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException

try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite

app = FastAPI(title="ResQDrive Damage Assessment Inference Service")

# Classes order must match the trained model's output index precisely
CLASSES = ["crack", "dent", "glass_shatter", "lamp_broken", "scratch", "tire_flat"]

# Severity mapping table as defined in Module 6.14 specifications
DAMAGE_TYPE_TO_SEVERITY = {
    "scratch": "minor",
    "dent": "minor",
    "lamp_broken": "moderate",
    "tire_flat": "moderate",
    "crack": "severe",
    "glass_shatter": "severe",
}

# Load the TFLite model at startup
try:
    interpreter = tflite.Interpreter(model_path="cardd_model.tflite")
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("Model cardd_model.tflite loaded successfully.")
except Exception as e:
    print(f"Error loading TFLite model: {e}")
    interpreter = None

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "cardd_v1",
        "model_loaded": interpreter is not None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    global interpreter
    if interpreter is None:
        raise HTTPException(status_code=500, detail="TFLite model is not loaded on server.")
        
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        start_time = time.time()

        # Read image bytes and preprocess
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        
        # Normalize: convert to array and scale to 0-1
        img_array = np.array(img, dtype=np.float32) / 255.0
        # Add batch dimension: shape becomes (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)

        # Run inference
        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])[0]

        # Get top class prediction
        predicted_idx = int(np.argmax(output))
        damage_type = CLASSES[predicted_idx]
        confidence = float(output[predicted_idx])
        severity = DAMAGE_TYPE_TO_SEVERITY.get(damage_type, "minor")

        inference_time_ms = int((time.time() - start_time) * 1000)

        return {
            "damage_type": damage_type,
            "confidence": round(confidence, 4),
            "severity": severity,
            "inference_time_ms": inference_time_ms,
            "all_scores": {CLASSES[i]: round(float(output[i]), 4) for i in range(len(CLASSES))}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {str(e)}")
