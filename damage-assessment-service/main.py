# main.py
# ════════════════════════════════════════════════════════════════════════════════
# ResQDrive Module 6.14 — Damage Assessment Microservice (Updated with Car-Verification Gate)
# 
# DESIGN NOTE:
# This update introduces a pre-inference "Car-Verification Gate" to mitigate the closed-set
# softmax problem inherent to the trained damage classifier (cardd_model.tflite). Closed-set
# classification models always force a probability distribution across their 6 known classes
# (crack, dent, glass_shatter, lamp_broken, scratch, tire_flat), causing non-car images (e.g.
# food, pets, furniture) to yield misleadingly confident damage predictions.
#
# Solution:
# 1. Car-Verification Gate: Uses a pretrained MobileNetV2 (ImageNet weights) to verify the presence
#    of a car or car part before invoking the damage classifier. Non-car images are rejected with HTTP 400.
# 2. Low-Confidence Warning: Flag results with confidence < 0.30 (`low_confidence_warning: true`).
#
# Known Limitation:
# Extreme macro close-ups lacking any recognizable vehicle shape, silhouette, wheel, mirror, or grille
# may pass or fail the gate incorrectly. This is an accepted trade-off of out-of-distribution filtering
# and is mitigated via user-facing guidance on the photo entry UI.
# ════════════════════════════════════════════════════════════════════════════════

import os
import io
import time
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException

import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
import tensorflow.lite as tflite

# DEPENDENCY CHOICE DOCUMENTATION:
# We use full `tensorflow` here to leverage Keras's pretrained MobileNetV2 with ImageNet weights
# and its built-in `decode_predictions` utility. This eliminates manual label parsing and ensures
# exact compatibility for out-of-distribution car presence verification.

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

# ImageNet class names corresponding to whole vehicles and component parts
CAR_RELATED_IMAGENET_CLASSES = {
    # Whole-vehicle ImageNet classes
    "convertible", "sports_car", "racer", "cab", "limousine", "jeep",
    "pickup", "minivan", "ambulance", "police_van", "moving_van",
    "garbage_truck", "fire_engine", "beach_wagon", "station_wagon",
    "tow_truck", "trailer_truck", "car", "motor_vehicle", "automobile",
    "passenger_car", "recreational_vehicle",
    # Part-level ImageNet classes (crucial for close-ups of damaged vehicle components)
    "car_wheel", "car_mirror", "grille", "disk_brake", "car_seat", "seat_belt",
    "bumper", "dashboard"
}

# 1. Load the existing TFLite damage classification model at startup
interpreter = None
input_details = None
output_details = None
try:
    model_path = os.path.join(os.path.dirname(__file__), "cardd_model.tflite")
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"Model cardd_model.tflite loaded successfully from {model_path}.")
except Exception as e:
    print(f"Error loading TFLite damage model: {e}")

# 2. Load the separate MobileNetV2 ImageNet model at startup for car verification
verification_model = None
try:
    print("Loading MobileNetV2 ImageNet model for car-verification gate...")
    verification_model = MobileNetV2(weights="imagenet")
    print("MobileNetV2 car-verification gate model loaded successfully.")
except Exception as e:
    print(f"Error loading MobileNetV2 verification model: {e}")


def is_likely_a_car(img: Image.Image) -> bool:
    """
    Car-Verification Gate: Runs the uploaded photo through ImageNet MobileNetV2,
    decodes top 10 predictions, and returns True if any predicted class matches
    CAR_RELATED_IMAGENET_CLASSES with confidence > 0.05.
    """
    if verification_model is None:
        print("[Car Verification Gate] Model unavailable — bypassing gate.")
        return True

    try:
        # Preprocess PIL image for MobileNetV2 (224x224, batch dimension)
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)

        # Preprocess for MobileNetV2 expecting [-1, 1] range
        preprocessed = preprocess_input(img_batch.copy())

        # Predict top 10 ImageNet classes
        preds = verification_model.predict(preprocessed, verbose=0)
        decoded = decode_predictions(preds, top=10)[0]

        # Check top 10 predicted class names against car/part set
        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if clean_name in CAR_RELATED_IMAGENET_CLASSES and float(score) > 0.05:
                print(f"[Car Verification Gate] Verified as car/part: {clean_name} ({score:.4f})")
                return True

        # Fallback check for partial keyword matches in top 10
        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if any(k in clean_name for k in ["car", "vehicle", "truck", "automobile", "grille", "brake"]) and float(score) > 0.05:
                print(f"[Car Verification Gate] Verified via keyword match: {clean_name} ({score:.4f})")
                return True

        top_classes = [d[1] for d in decoded]
        print(f"[Car Verification Gate] Rejected non-car image. Top 10 predictions: {top_classes}")
        return False
    except Exception as e:
        print(f"[Car Verification Gate] Exception during verification: {e}")
        return True  # Fallback to True on error so service remains operational


@app.get("/health")
def health():
    return {
        "status": "ok",
        "damage_model": "cardd_v1",
        "damage_model_loaded": interpreter is not None,
        "car_verification_gate_loaded": verification_model is not None,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    global interpreter
    if interpreter is None:
        raise HTTPException(status_code=500, detail="TFLite damage model is not loaded on server.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        start_time = time.time()

        # Read image bytes and convert to PIL RGB Image
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 1. RUN CAR-VERIFICATION GATE BEFORE RUNNING DAMAGE CLASSIFIER
        if not is_likely_a_car(img):
            raise HTTPException(
                status_code=400,
                detail="This doesn't appear to be a photo of a car or car part. Please upload a clear photo of the damaged vehicle, ideally showing some recognizable part of the car (wheel, mirror, body panel shape) alongside the damage."
            )

        # 2. Preprocess for cardd_model.tflite damage classifier (224x224, normalized 0.0 to 1.0)
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # 3. Execute TFLite damage classifier inference
        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])[0]

        # 4. Extract top prediction & confidence
        predicted_idx = int(np.argmax(output))
        damage_type = CLASSES[predicted_idx]
        confidence = float(output[predicted_idx])
        severity = DAMAGE_TYPE_TO_SEVERITY.get(damage_type, "minor")

        # 5. Check low confidence warning threshold (< 0.30)
        low_confidence_warning = True if confidence < 0.30 else False

        inference_time_ms = int((time.time() - start_time) * 1000)

        return {
            "damage_type": damage_type,
            "confidence": round(confidence, 4),
            "severity": severity,
            "inference_time_ms": inference_time_ms,
            "all_scores": {CLASSES[i]: round(float(output[i]), 4) for i in range(len(CLASSES))},
            "low_confidence_warning": low_confidence_warning,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {str(e)}")
