# main.py
# ════════════════════════════════════════════════════════════════════════════════
# ResQDrive Module 6.14 — Damage Assessment Microservice (YOLO / PyTorch Mode)
# ════════════════════════════════════════════════════════════════════════════════
#
# ARCHITECTURE SUMMARY:
# 1. Car-Verification Gate (MobileNetV2 ImageNet):
#    Verifies if the photo contains a car or car part before damage evaluation.
#
# 2. YOLO Object Detection Model (best (1).pt / best.pt):
#    Detects damage classes with bounding box localization:
#    ["dent", "scratch", "crack", "glass shatter", "lamp broken", "tire flat"].
#
# 3. Standby Classifier (cardd_model.tflite):
#    Preserved in folder as a secondary/fallback model if YOLO model is absent.
# ════════════════════════════════════════════════════════════════════════════════

import os
import io
import time
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException

try:
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False
try:
    import tensorflow.lite as tflite
except ImportError:
    tflite = None

# Ultralytics YOLO import
try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False

app = FastAPI(title="ResQDrive Damage Assessment Microservice")

CLASSES = ["crack", "dent", "glass_shatter", "lamp_broken", "scratch", "tire_flat"]

DAMAGE_TYPE_TO_SEVERITY = {
    "scratch": "minor",
    "dent": "minor",
    "lamp_broken": "moderate",
    "lamp broken": "moderate",
    "broken_lamp": "moderate",
    "broken lamp": "moderate",
    "tire_flat": "moderate",
    "tire flat": "moderate",
    "flat_tire": "moderate",
    "flat tire": "moderate",
    "crack": "severe",
    "glass_shatter": "severe",
    "glass shatter": "severe",
    "shattered_glass": "severe",
    "shattered glass": "severe",
}

# ImageNet vehicle and part verification classes
CAR_RELATED_IMAGENET_CLASSES = {
    "convertible", "sports_car", "racer", "cab", "limousine", "jeep",
    "pickup", "minivan", "ambulance", "police_van", "moving_van",
    "garbage_truck", "fire_engine", "beach_wagon", "station_wagon",
    "tow_truck", "trailer_truck", "car", "motor_vehicle", "automobile",
    "passenger_car", "recreational_vehicle",
    "car_wheel", "car_mirror", "grille", "disk_brake", "car_seat", "seat_belt",
    "bumper", "dashboard"
}

# 1. Load Primary YOLO damage detection model
yolo_model = None
yolo_model_path = None

if HAS_ULTRALYTICS:
    for candidate in ["trained.pt", "best (1).pt", "best.pt"]:
        path = os.path.join(os.path.dirname(__file__), candidate)
        if os.path.exists(path) and os.path.getsize(path) > 100000: # Ignore LFS pointer text files (< 100KB)
            try:
                yolo_model = YOLO(path)
                yolo_model_path = path
                print(f"✅ Primary YOLO damage model loaded successfully from {candidate}.")
                break
            except Exception as e:
                print(f"Error loading YOLO model from {candidate}: {e}")

# 2. Load Secondary TFLite damage classifier (cardd_model.tflite) as fallback/standby
interpreter = None
input_details = None
output_details = None
try:
    tflite_path = os.path.join(os.path.dirname(__file__), "cardd_model.tflite")
    if os.path.exists(tflite_path) and tflite is not None:
        interpreter = tflite.Interpreter(model_path=tflite_path)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        print(f"📦 Standby TFLite damage model loaded successfully from cardd_model.tflite.")
except Exception as e:
    print(f"Error loading standby TFLite damage model: {e}")

# 3. Load MobileNetV2 ImageNet Car-Verification Gate at startup
verification_model = None
if HAS_TENSORFLOW:
    try:
        print("Loading MobileNetV2 ImageNet model for car-verification gate...")
        verification_model = MobileNetV2(weights="imagenet")
        print("MobileNetV2 car-verification gate model loaded successfully.")
    except Exception as e:
        print(f"Error loading MobileNetV2 verification model: {e}")


def is_likely_a_car(img: Image.Image) -> bool:
    """
    Car-Verification Gate: Rejects non-vehicle photos before damage inference.
    """
    if verification_model is None:
        return True

    try:
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)
        preprocessed = preprocess_input(img_batch.copy())

        preds = verification_model.predict(preprocessed, verbose=0)
        decoded = decode_predictions(preds, top=10)[0]

        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if clean_name in CAR_RELATED_IMAGENET_CLASSES and float(score) > 0.05:
                print(f"[Car Verification Gate] Verified as car/part: {clean_name} ({score:.4f})")
                return True

        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if any(k in clean_name for k in ["car", "vehicle", "truck", "automobile", "grille", "brake"]) and float(score) > 0.05:
                print(f"[Car Verification Gate] Verified via keyword match: {clean_name} ({score:.4f})")
                return True

        print(f"[Car Verification Gate] Rejected non-car image.")
        return False
    except Exception as e:
        print(f"[Car Verification Gate] Error during verification: {e}")
        return True


@app.get("/health")
def health():
    active_model = "yolo_pt" if yolo_model is not None else ("cardd_tflite" if interpreter is not None else "none")
    return {
        "status": "ok",
        "active_damage_model": active_model,
        "yolo_model_loaded": yolo_model is not None,
        "tflite_model_loaded": interpreter is not None,
        "car_verification_gate_loaded": verification_model is not None,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if yolo_model is None and interpreter is None:
        raise HTTPException(status_code=500, detail="No damage assessment model is loaded on server.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        start_time = time.time()

        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 1. Car-Verification Gate Check
        if not is_likely_a_car(img):
            raise HTTPException(
                status_code=400,
                detail="This doesn't appear to be a photo of a car or car part. Please upload a clear photo of the damaged vehicle."
            )

        # 2. Run Primary YOLO Inference if available
        if yolo_model is not None:
            results = yolo_model.predict(img, verbose=False)
            boxes = results[0].boxes

            detections = []
            all_scores = {cls: 0.0 for cls in ["dent", "scratch", "crack", "glass shatter", "lamp broken", "tire flat"]}

            best_damage_type = "dent"
            best_confidence = 0.0
            best_severity = "minor"

            if len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = yolo_model.names[cls_id]
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

                    clean_name = cls_name.replace(" ", "_")
                    all_scores[cls_name] = max(all_scores.get(cls_name, 0.0), round(conf, 4))

                    sev = DAMAGE_TYPE_TO_SEVERITY.get(cls_name, DAMAGE_TYPE_TO_SEVERITY.get(clean_name, "minor"))

                    detections.append({
                        "class": clean_name,
                        "confidence": round(conf, 4),
                        "severity": sev,
                        "box": [round(c, 2) for c in xyxy],
                    })

                    if conf > best_confidence:
                        best_confidence = conf
                        best_damage_type = clean_name
                        best_severity = sev
            else:
                best_confidence = 0.20
                best_damage_type = "unknown"
                best_severity = "minor"

            low_confidence_warning = True if best_confidence < 0.30 else False
            inference_time_ms = int((time.time() - start_time) * 1000)

            return {
                "damage_type": best_damage_type,
                "confidence": round(best_confidence, 4),
                "severity": best_severity,
                "inference_time_ms": inference_time_ms,
                "all_scores": all_scores,
                "low_confidence_warning": low_confidence_warning,
                "detections": detections,
                "model_used": "yolo_pt",
            }

        # 3. Fallback TFLite Classifier Inference if YOLO is unavailable
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])[0]

        predicted_idx = int(np.argmax(output))
        damage_type = CLASSES[predicted_idx]
        confidence = float(output[predicted_idx])
        severity = DAMAGE_TYPE_TO_SEVERITY.get(damage_type, "minor")
        low_confidence_warning = True if confidence < 0.30 else False
        inference_time_ms = int((time.time() - start_time) * 1000)

        return {
            "damage_type": damage_type,
            "confidence": round(confidence, 4),
            "severity": severity,
            "inference_time_ms": inference_time_ms,
            "all_scores": {CLASSES[i]: round(float(output[i]), 4) for i in range(len(CLASSES))},
            "low_confidence_warning": low_confidence_warning,
            "detections": [],
            "model_used": "cardd_tflite",
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {str(e)}")
