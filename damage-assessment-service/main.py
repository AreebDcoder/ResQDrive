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

from ml_inference import ml_router, load_models

app = FastAPI(title="ResQDrive Damage Assessment Microservice")
app.include_router(ml_router)

@app.on_event("startup")
def startup_event():
    load_models()

CLASSES = ["crack", "dent", "glass_shatter", "lamp_broken", "scratch", "tire_flat"]


def evaluate_class_severity(clean_name: str, conf: float, area_ratio: float) -> tuple[str, int]:
    """
    Evaluates dynamic severity level (1=minor, 2=moderate, 3=severe) for ALL 6 damage classes 
    based on Bounding Box Area Ratio (R_area) and Confidence Percentage (Conf).
    """
    cls = clean_name.lower().replace(" ", "_")

    # 1. Scratches & Dents (Base: minor)
    if cls in ["scratch", "dent"]:
        if area_ratio >= 0.40 and conf >= 0.45:
            return "severe", 3
        elif area_ratio >= 0.18 and conf >= 0.35:
            return "moderate", 2
        else:
            return "minor", 1

    # 2. Broken Lamps & Flat Tires (Base: moderate)
    elif cls in ["lamp_broken", "broken_lamp", "tire_flat", "flat_tire"]:
        if area_ratio >= 0.25 and conf >= 0.40:
            return "severe", 3
        elif area_ratio < 0.05 and conf < 0.35:
            return "minor", 1
        else:
            return "moderate", 2

    # 3. Cracks (Base: severe)
    elif cls in ["crack"]:
        if area_ratio >= 0.15 or conf >= 0.50:
            return "severe", 3
        elif area_ratio < 0.08 and conf < 0.45:
            return "moderate", 2
        else:
            return "severe", 3

    # 4. Glass Shatter (Base: severe)
    elif cls in ["glass_shatter", "shattered_glass"]:
        if area_ratio >= 0.20 or conf >= 0.50:
            return "severe", 3
        elif area_ratio < 0.06 and conf < 0.40:
            return "moderate", 2
        else:
            return "severe", 3

    # Fallback for unexpected classes: dynamic scaling based on area and confidence
    if area_ratio >= 0.35 or conf >= 0.70:
        return "severe", 3
    elif area_ratio >= 0.15 or conf >= 0.40:
        return "moderate", 2
    else:
        return "minor", 1

# ImageNet vehicle and part verification classes
CAR_RELATED_IMAGENET_CLASSES = {
    "convertible", "sports_car", "racer", "cab", "limousine", "jeep",
    "pickup", "minivan", "ambulance", "police_van", "moving_van",
    "garbage_truck", "fire_engine", "beach_wagon", "station_wagon",
    "tow_truck", "trailer_truck", "car", "motor_vehicle", "automobile",
    "passenger_car", "recreational_vehicle", "half_track", "tank", "snowplow",
    "forklift", "tractor", "go-kart", "golfcart", "moped", "motor_scooter", "motorcycle",
    "car_wheel", "car_mirror", "grille", "radiator_grille", "disk_brake", "car_seat", "seat_belt",
    "bumper", "dashboard", "radiator", "shield", "steel_drum", "crash_helmet", "plate"
}

CAR_RELATED_KEYWORDS = [
    "car", "vehic", "truck", "auto", "grille", "brake", "bumper",
    "dashboard", "wheel", "tire", "radiator", "hood", "fender", "door",
    "windshield", "headlight", "taillight", "mirror", "seat", "shield", "metal", "chassis",
    "convertible", "cab", "wagon", "van", "jeep", "pickup", "motor", "iron", "tray", "drum", "plate"
]

NON_CAR_KEYWORDS = [
    # Animals & nature
    "dog", "cat", "bird", "fish", "horse", "cow", "sheep", "pig", "bear", "lion", "tiger",
    "rabbit", "monkey", "elephant", "frog", "reptile", "insect", "spider", "snake", "lizard",
    "retriever", "terrier", "spaniel", "hound", "poodle", "bulldog", "shepherd", "pug", "chihuahua",
    "tabby", "siamese", "persian",
    # Food & drinks
    "pizza", "burger", "sandwich", "hotdog", "bagel", "banana", "apple", "bread", "cake", "ice_cream", "soup",
    # People & clothing
    "groom", "gown", "dress", "suit", "uniform", "jersey", "wig", "skirt", "shoe", "boot", "sandal",
    "bikini", "brassiere", "diaper", "pajama", "swimming_trunks",
    # Household & indoor furnishings
    "sofa", "couch", "pillow", "quilt", "toilet", "microwave", "toaster", "laptop", "cellular_telephone"
]

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
                print(f"[DamageService] Primary YOLO damage model loaded successfully from {candidate}.")
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
        print(f"[DamageService] Standby TFLite damage model loaded successfully from cardd_model.tflite.")
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


def is_likely_a_car(img: Image.Image) -> tuple[bool, bool]:
    """
    Car-Verification Gate: Inspects photo with MobileNetV2 ImageNet classifier.
    Returns: (is_car_confirmed, is_definitely_non_car)
    """
    if verification_model is None:
        return True, False

    try:
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)
        preprocessed = preprocess_input(img_batch.copy())

        preds = verification_model.predict(preprocessed, verbose=0)
        decoded = decode_predictions(preds, top=25)[0]

        top_5_summary = ", ".join([f"{c} ({s:.2f})" for _, c, s in decoded[:5]])
        print(f"[Car Verification Gate] ImageNet top predictions: {top_5_summary}")

        # 1. Whole vehicle or automotive part match
        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if clean_name in CAR_RELATED_IMAGENET_CLASSES and float(score) >= 0.015:
                print(f"[Car Verification Gate] Verified as car/part: {clean_name} ({score:.4f})")
                return True, False

        for _, class_name, score in decoded:
            clean_name = class_name.lower().strip()
            if any(k in clean_name for k in CAR_RELATED_KEYWORDS) and float(score) >= 0.015:
                print(f"[Car Verification Gate] Verified via keyword match: {clean_name} ({score:.4f})")
                return True, False

        # 2. Definite non-car match (people, pets, food, indoor furniture)
        top_class = decoded[0][1].lower().strip()
        top_score = float(decoded[0][2])
        if top_score >= 0.25 and any(k in top_class for k in NON_CAR_KEYWORDS):
            print(f"[Car Verification Gate] Confirmed non-vehicle subject: {top_class} ({top_score:.4f})")
            return False, True

        # 3. Macro / close-up crop of vehicle body (e.g. dent on sheet metal, scratch on door)
        print(f"[Car Verification Gate] Ambiguous/close-up crop. Deferring validation to damage model.")
        return False, False
    except Exception as e:
        print(f"[Car Verification Gate] Error during verification: {e}")
        return True, False


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
        is_car_confirmed, is_definitely_non_car = is_likely_a_car(img)

        if is_definitely_non_car:
            raise HTTPException(
                status_code=400,
                detail="This doesn't appear to be a photo of a vehicle. Please upload a clear photo of the damaged vehicle or damaged car part."
            )

        # 2. Run Primary YOLO Inference if available
        if yolo_model is not None:
            results = yolo_model.predict(img, verbose=False)
            boxes = results[0].boxes

            img_w, img_h = img.width, img.height
            img_area = max(1, img_w * img_h)

            detections = []
            all_scores = {cls: 0.0 for cls in ["dent", "scratch", "crack", "glass shatter", "lamp broken", "tire flat"]}

            best_damage_type = "dent"
            best_confidence = 0.0
            highest_sev_level = 1

            if len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = yolo_model.names[cls_id]
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

                    clean_name = cls_name.replace(" ", "_")
                    all_scores[cls_name] = max(all_scores.get(cls_name, 0.0), round(conf, 4))

                    # Calculate Bounding Box Area Ratio (Damage Area vs Full Image Area)
                    box_w = max(0, xyxy[2] - xyxy[0])
                    box_h = max(0, xyxy[3] - xyxy[1])
                    box_area = box_w * box_h
                    area_ratio = round(box_area / img_area, 4)

                    # Dynamic Area Ratio & Confidence Percentage Evaluation for ALL 6 classes
                    det_sev, sev_level = evaluate_class_severity(clean_name, conf, area_ratio)

                    detections.append({
                        "class": clean_name,
                        "confidence": round(conf, 4),
                        "area_ratio": area_ratio,
                        "severity": det_sev,
                        "box": [round(c, 2) for c in xyxy],
                    })

                    if sev_level > highest_sev_level:
                        highest_sev_level = sev_level

                    if conf > best_confidence:
                        best_confidence = conf
                        best_damage_type = clean_name

                # 4. Multi-detection cumulative area boost:
                # If combined confidence-weighted damage area across all detections >= 0.35, escalate overall severity tier
                total_weighted_area = sum(d["confidence"] * d["area_ratio"] for d in detections)
                if total_weighted_area >= 0.35 and highest_sev_level < 3:
                    highest_sev_level += 1

                best_severity = "minor" if highest_sev_level == 1 else ("moderate" if highest_sev_level == 2 else "severe")
            else:
                if not is_car_confirmed:
                    raise HTTPException(
                        status_code=400,
                        detail="This doesn't appear to be a photo of a vehicle or vehicle damage. Please upload a clear photo of the damaged vehicle."
                    )
                best_confidence = 0.20
                best_damage_type = "dent"
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

        if not is_car_confirmed and confidence < 0.25:
            raise HTTPException(
                status_code=400,
                detail="This doesn't appear to be a photo of a vehicle or vehicle damage. Please upload a clear photo of the damaged vehicle."
            )

        # Discarded static baseline mapping:
        # Dynamic severity based on confidence and prediction prominence
        if confidence >= 0.75:
            severity = "severe"
        elif confidence >= 0.45:
            severity = "moderate"
        else:
            severity = "minor"
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
