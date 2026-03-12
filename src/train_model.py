"""
INIDS - Model Training Module
Trains Random Forest on KDD Cup data and saves model + metadata to models/.
"""

import os
import sys
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)

# Make sibling imports work when run directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_processing import load_and_preprocess, COLUMN_NAMES

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'intrusion_model.pkl')
META_PATH = os.path.join(MODELS_DIR, 'model_meta.json')


def train_and_save(data_path=None, n_estimators=100, random_state=42):
    """
    Full training pipeline. Returns a metrics dict.
    Saves model to models/intrusion_model.pkl
    """
    os.makedirs(MODELS_DIR, exist_ok=True)

    # ── Load data ──────────────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test, encoders, feature_names, attack_counts = \
        load_and_preprocess(data_path=data_path)

    # ── Train ──────────────────────────────────────────────────────────────────
    print(f"[Training] Fitting RandomForest (n_estimators={n_estimators}) ...")
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=random_state,
        n_jobs=-1,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    # ── Evaluate ───────────────────────────────────────────────────────────────
    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred, target_names=['normal', 'attack'], output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Feature importances (top 10)
    importances = model.feature_importances_
    feat_imp = sorted(
        zip(feature_names, importances.tolist()),
        key=lambda x: x[1], reverse=True
    )[:15]

    print(f"[Training] Accuracy: {accuracy:.4f}")

    # ── Save model + encoders ──────────────────────────────────────────────────
    bundle = {
        'model': model,
        'encoders': encoders,
        'feature_names': feature_names,
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"[Training] Model saved to {MODEL_PATH}")

    # ── Save metadata JSON ─────────────────────────────────────────────────────
    meta = {
        'accuracy': accuracy,
        'n_estimators': n_estimators,
        'n_train': int(X_train.shape[0]),
        'n_test': int(X_test.shape[0]),
        'confusion_matrix': cm,
        'report': report,
        'feature_importances': feat_imp,
        'attack_type_counts': attack_counts.head(20).to_dict(),
    }
    with open(META_PATH, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"[Training] Metadata saved to {META_PATH}")

    return meta


def load_model():
    """Load saved model bundle from disk."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run train_model.py first."
        )
    bundle = joblib.load(MODEL_PATH)
    return bundle['model'], bundle['encoders'], bundle['feature_names']


def load_meta():
    """Load model metadata JSON."""
    if not os.path.exists(META_PATH):
        return {}
    with open(META_PATH) as f:
        return json.load(f)


if __name__ == '__main__':
    meta = train_and_save()
    print(f"\n{'='*50}")
    print(f"Model Accuracy: {meta['accuracy']:.4f}")
    print(f"Train samples : {meta['n_train']:,}")
    print(f"Test samples  : {meta['n_test']:,}")
    print(f"\nTop 5 most important features:")
    for feat, imp in meta['feature_importances'][:5]:
        print(f"  {feat:<35} {imp:.4f}")