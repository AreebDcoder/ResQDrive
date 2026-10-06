# ml_inference.py
# ════════════════════════════════════════════════════════════════════════════════
# ResQDrive — VZCrash Accident Detection & Severity ML Inference Service
# ════════════════════════════════════════════════════════════════════════════════

import os
import math
import logging
from typing import Dict, Any, List, Union
import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator, ConfigDict

logger = logging.getLogger("ml_inference")
logger.setLevel(logging.INFO)

ml_router = APIRouter(prefix="/ml", tags=["ML Inference"])

# Paths to trained model files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
AD_MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "accident_detection", "vzcrash_accident_detector.pkl")
SEV_PKG_PATH = os.path.join(PROJECT_ROOT, "ml", "severity", "vzcrash_severity_model_package.pkl")

# Cached model instances in memory
ad_model = None
sev_model = None
sev_package = None

ACCIDENT_LABELS = {
    0: "crash",
    1: "near_miss",
    2: "normal_driving",
}

ACCIDENT_FEATURE_NAMES = [
    "accel_peak", "accel_mean", "accel_std", "accel_rms",
    "jerk_peak", "jerk_mean", "jerk_std",
    "gyro_peak", "gyro_mean", "gyro_std", "gyro_rms",
    "speed_initial", "speed_final", "speed_max", "speed_min", "speed_drop", "speed_range",
]

SEVERITY_FEATURE_NAMES = [
    "accel_peak", "accel_mean", "accel_std", "accel_rms",
    "jerk_peak", "jerk_mean", "jerk_std",
    "gyro_peak", "gyro_mean", "gyro_std", "gyro_rms",
    "speed_initial", "speed_final", "speed_max", "speed_min", "speed_drop", "speed_range",
    "impact_duration_ms", "audio_detected",
]


def load_models():
    """Load both Random Forest models once during startup and keep them in memory."""
    global ad_model, sev_model, sev_package

    # 1. Load VZCrash Accident Detector
    try:
        print("[ML] Loading VZCrash accident model from:", AD_MODEL_PATH)
        if os.path.exists(AD_MODEL_PATH):
            ad_model = joblib.load(AD_MODEL_PATH)
            print(f"[ML] VZCrash accident model loaded successfully! (Trees: {ad_model.n_estimators}, Features: {ad_model.n_features_in_})")
        else:
            print(f"[ML] Warning: {AD_MODEL_PATH} not found!")
    except Exception as e:
        print(f"[ML] Error loading VZCrash accident model: {e}")

    # 2. Load Severity Assessment Model Package
    try:
        print("[ML] Loading severity model package from:", SEV_PKG_PATH)
        if os.path.exists(SEV_PKG_PATH):
            sev_package = joblib.load(SEV_PKG_PATH)
            if isinstance(sev_package, dict) and "model" in sev_package:
                sev_model = sev_package["model"]
            else:
                sev_model = sev_package
            print(f"[ML] Severity model loaded successfully! (Trees: {sev_model.n_estimators}, Classes: {list(sev_model.classes_)}, Features: {sev_model.n_features_in_})")
        else:
            print(f"[ML] Warning: {SEV_PKG_PATH} not found!")
    except Exception as e:
        print(f"[ML] Error loading severity model: {e}")


def _validate_finite(v: float, name: str) -> float:
    if v is None or math.isnan(v) or math.isinf(v):
        raise ValueError(f"Feature '{name}' must be a finite number, received: {v}")
    return float(v)


class AccidentDetectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accel_peak: float
    accel_mean: float
    accel_std: float
    accel_rms: float

    jerk_peak: float
    jerk_mean: float
    jerk_std: float

    gyro_peak: float
    gyro_mean: float
    gyro_std: float
    gyro_rms: float

    speed_initial: float
    speed_final: float
    speed_max: float
    speed_min: float
    speed_drop: float
    speed_range: float

    @field_validator("*")
    def check_finite(cls, v, info):
        return _validate_finite(v, info.field_name)


class SeverityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accel_peak: float
    accel_mean: float
    accel_std: float
    accel_rms: float

    jerk_peak: float
    jerk_mean: float
    jerk_std: float

    gyro_peak: float
    gyro_mean: float
    gyro_std: float
    gyro_rms: float

    speed_initial: float
    speed_final: float
    speed_max: float
    speed_min: float
    speed_drop: float
    speed_range: float

    impact_duration_ms: float
    audio_detected: Union[bool, int, float]

    @field_validator(
        "accel_peak", "accel_mean", "accel_std", "accel_rms",
        "jerk_peak", "jerk_mean", "jerk_std",
        "gyro_peak", "gyro_mean", "gyro_std", "gyro_rms",
        "speed_initial", "speed_final", "speed_max", "speed_min",
        "speed_drop", "speed_range", "impact_duration_ms"
    )
    def check_finite_fields(cls, v, info):
        return _validate_finite(v, info.field_name)

    @field_validator("audio_detected")
    def check_audio_detected(cls, v):
        if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
            raise ValueError(f"audio_detected must be boolean or 0/1, received: {v}")
        if v not in (0, 1, True, False):
            raise ValueError(f"audio_detected must be strictly 0, 1, True, or False, received: {v}")
        return 1 if bool(v) else 0


@ml_router.get("/health")
def ml_health():
    """Health check endpoint reporting in-memory model status."""
    return {
        "status": "ok",
        "accident_model_loaded": ad_model is not None,
        "severity_model_loaded": sev_model is not None,
        "accident_features": ACCIDENT_FEATURE_NAMES,
        "severity_features": SEVERITY_FEATURE_NAMES,
    }


@ml_router.post("/accident-detection")
def predict_accident(req: AccidentDetectionRequest):
    """
    Model 1 — VZCrash Accident Detection RF
    Evaluates exactly the 17 IMU and Speed features.
    Returns prediction ('crash' | 'near_miss' | 'normal_driving'), label_id, and probabilities.
    """
    if ad_model is None:
        raise HTTPException(status_code=503, detail="VZCrash accident detection model is not loaded.")

    try:
        # Construct feature vector in exact order expected by trained model
        feature_vector = [
            req.accel_peak, req.accel_mean, req.accel_std, req.accel_rms,
            req.jerk_peak, req.jerk_mean, req.jerk_std,
            req.gyro_peak, req.gyro_mean, req.gyro_std, req.gyro_rms,
            req.speed_initial, req.speed_final, req.speed_max, req.speed_min,
            req.speed_drop, req.speed_range,
        ]

        # Single sample batch shape (1, 17)
        x = np.array([feature_vector], dtype=np.float32)

        raw_pred = int(ad_model.predict(x)[0])
        probas = ad_model.predict_proba(x)[0]

        # Map classes based on trained classes_
        classes = list(ad_model.classes_)
        prob_dict: Dict[str, float] = {}
        for idx, cls_val in enumerate(classes):
            label_name = ACCIDENT_LABELS.get(int(cls_val), str(cls_val))
            prob_dict[label_name] = round(float(probas[idx]), 4)

        prediction_name = ACCIDENT_LABELS.get(raw_pred, str(raw_pred))

        print(f"[AccidentDetection] VZCrash prediction: {prediction_name} (id: {raw_pred}) | Probabilities: {prob_dict}")

        return {
            "prediction": prediction_name,
            "label_id": raw_pred,
            "probabilities": prob_dict,
        }
    except Exception as e:
        print(f"[AccidentDetection] Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Accident detection inference failed: {str(e)}")


@ml_router.post("/severity")
def predict_severity(req: SeverityRequest):
    """
    Model 2 — Severity Assessment RF
    Evaluates exactly the 19 features (17 kinematic features + impact_duration_ms + audio_detected).
    Returns severity ('Minor' | 'Moderate' | 'Severe'), probabilities, and verified features.
    """
    if sev_model is None:
        raise HTTPException(status_code=503, detail="Severity assessment model is not loaded.")

    try:
        audio_val = 1 if req.audio_detected else 0

        # Construct feature vector in exact order expected by trained model
        feature_vector = [
            req.accel_peak, req.accel_mean, req.accel_std, req.accel_rms,
            req.jerk_peak, req.jerk_mean, req.jerk_std,
            req.gyro_peak, req.gyro_mean, req.gyro_std, req.gyro_rms,
            req.speed_initial, req.speed_final, req.speed_max, req.speed_min,
            req.speed_drop, req.speed_range,
            req.impact_duration_ms, audio_val,
        ]

        # Single sample batch shape (1, 19)
        x = np.array([feature_vector], dtype=np.float32)

        raw_pred = str(sev_model.predict(x)[0])
        probas = sev_model.predict_proba(x)[0]

        classes = list(sev_model.classes_)
        prob_dict: Dict[str, float] = {}
        for idx, cls_name in enumerate(classes):
            prob_dict[str(cls_name)] = round(float(probas[idx]), 4)

        print(f"[SeverityML] Prediction: {raw_pred} | Probabilities: {prob_dict} | Audio: {bool(audio_val)} | Duration: {req.impact_duration_ms}ms")

        # Prepare verified features dict for debug panel inspection
        features_dict = {
            "accel_peak": req.accel_peak,
            "accel_mean": req.accel_mean,
            "accel_std": req.accel_std,
            "accel_rms": req.accel_rms,
            "jerk_peak": req.jerk_peak,
            "jerk_mean": req.jerk_mean,
            "jerk_std": req.jerk_std,
            "gyro_peak": req.gyro_peak,
            "gyro_mean": req.gyro_mean,
            "gyro_std": req.gyro_std,
            "gyro_rms": req.gyro_rms,
            "speed_initial": req.speed_initial,
            "speed_final": req.speed_final,
            "speed_max": req.speed_max,
            "speed_min": req.speed_min,
            "speed_drop": req.speed_drop,
            "speed_range": req.speed_range,
            "impact_duration_ms": req.impact_duration_ms,
            "audio_detected": bool(audio_val),
        }

        return {
            "severity": raw_pred,
            "probabilities": prob_dict,
            "features": features_dict,
        }
    except Exception as e:
        print(f"[SeverityML] Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Severity assessment inference failed: {str(e)}")
