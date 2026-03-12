"""
INIDS - Detection Engine
Wraps model inference and provides a clean predict API.
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from train_model import load_model, load_meta
from data_processing import encode_packet

_model = None
_encoders = None
_feature_names = None
_meta = None


def _ensure_loaded():
    global _model, _encoders, _feature_names, _meta
    if _model is None:
        _model, _encoders, _feature_names = load_model()
        _meta = load_meta()
        print("[DetectionEngine] Model loaded successfully")


def predict_packet(packet_dict: dict) -> dict:
    """
    Predict a single packet given a feature dictionary.
    Returns {label, prediction, confidence, top_feature}.
    """
    _ensure_loaded()
    X = encode_packet(packet_dict, _encoders, _feature_names)
    prediction = int(_model.predict(X)[0])
    probas = _model.predict_proba(X)[0]
    confidence = float(max(probas))

    label = 'Attack' if prediction == 1 else 'Normal'
    return {
        'prediction': prediction,
        'label': label,
        'confidence': round(confidence * 100, 2),
        'probabilities': {
            'normal': round(float(probas[0]) * 100, 2),
            'attack': round(float(probas[1]) * 100, 2),
        }
    }


def get_model_info() -> dict:
    """Return model metadata for the dashboard."""
    _ensure_loaded()
    return _meta or {}


def get_model():
    """Return the raw sklearn model (used by simulator)."""
    _ensure_loaded()
    return _model, _encoders, _feature_names
