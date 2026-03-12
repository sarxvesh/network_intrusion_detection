"""
INIDS - Flask Backend API
Serves ML predictions, packet simulation data, and system statistics.
"""

import os
import sys
import json
import time
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS

# ── Path setup ─────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(PROJECT_ROOT, 'src')
sys.path.insert(0, SRC_PATH)

from detection_engine import predict_packet, get_model_info, get_model
from train_model import train_and_save, load_meta

app = Flask(__name__)
CORS(app)

# ── Global simulator instance ──────────────────────────────────────────────────
_simulator = None
_start_time = time.time()


def get_simulator():
    global _simulator
    if _simulator is None:
        try:
            from packet_simulator import PacketSimulator
            model, encoders, feature_names = get_model()
            _simulator = PacketSimulator(
                model=model,
                encoders=encoders,
                feature_names=feature_names,
                interval=0.25,   # 4 packets per second
            )
            _simulator.start()
            print("[API] Packet simulator started")
        except FileNotFoundError as e:
            print(f"[API] WARNING: {e}")
            print("[API] Run: python src/train_model.py first")
    return _simulator


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()})


@app.route('/api/stats', methods=['GET'])
def stats():
    """System-wide statistics."""
    sim = get_simulator()
    uptime = round(time.time() - _start_time, 1)
    meta = load_meta()

    base = {
        'uptime_seconds': uptime,
        'model_accuracy': meta.get('accuracy', 0),
        'n_train': meta.get('n_train', 0),
        'n_test': meta.get('n_test', 0),
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }

    if sim:
        sim_stats = sim.get_stats()
        base.update(sim_stats)
    else:
        base.update({
            'total_packets': 0,
            'total_attacks': 0,
            'attack_rate': 0.0,
            'packets_per_second': 0.0,
            'protocol_counts': {'tcp': 0, 'udp': 0, 'icmp': 0},
        })

    return jsonify(base)


@app.route('/api/traffic', methods=['GET'])
def traffic():
    """Recent simulated packets."""
    n = int(request.args.get('n', 50))
    n = min(n, 200)
    sim = get_simulator()
    packets = sim.get_recent_packets(n) if sim else []
    return jsonify({'packets': packets, 'count': len(packets)})


@app.route('/api/alerts', methods=['GET'])
def alerts():
    """Recent intrusion alerts."""
    n = int(request.args.get('n', 20))
    sim = get_simulator()
    alert_list = sim.get_alerts(n) if sim else []
    return jsonify({'alerts': alert_list, 'count': len(alert_list)})


@app.route('/api/traffic-history', methods=['GET'])
def traffic_history():
    """Per-second traffic history for charts."""
    sim = get_simulator()
    history = sim.get_traffic_history() if sim else []
    return jsonify({'history': history})


@app.route('/api/predict', methods=['POST'])
def predict():
    """Single-packet prediction from JSON body."""
    data = request.get_json(force=True) or {}
    if not data:
        return jsonify({'error': 'Empty request body'}), 400
    try:
        result = predict_packet(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Model metadata and feature importances."""
    try:
        info = get_model_info()
        return jsonify(info)
    except FileNotFoundError as e:
        return jsonify({'error': str(e), 'hint': 'Run python src/train_model.py first'}), 503


@app.route('/api/train', methods=['POST'])
def train():
    """Trigger model retraining (blocking — may take a few minutes)."""
    try:
        meta = train_and_save()
        # Reset cached model so next request reloads it
        import detection_engine
        detection_engine._model = None
        global _simulator
        _simulator = None
        return jsonify({'status': 'success', 'accuracy': meta['accuracy'], 'meta': meta})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("="*60)
    print("  INIDS Flask API")
    print("  http://localhost:5000")
    print("="*60)
    # Pre-init simulator on startup if model exists
    get_simulator()
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
