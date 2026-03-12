"""
INIDS - Packet Simulation Engine
Streams packets from the test set one-by-one, simulating live network traffic.
Uses a sliding window (collections.deque) to track recent packet history.
Thread-safe via threading.Lock.
"""

import os
import sys
import time
import threading
import random
from collections import deque
from datetime import datetime, timezone

import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_processing import load_and_preprocess, DEFAULT_DATA_PATH, COLUMN_NAMES

# Protocols for display (from KDD encoded values, mapped back for readability)
PROTOCOL_MAP = {0: 'icmp', 1: 'tcp', 2: 'udp'}
SIMULATED_IPS = [
    '192.168.1.{}'.format(i) for i in range(1, 50)
] + [
    '10.0.0.{}'.format(i) for i in range(1, 30)
] + [
    '172.16.{}.{}'.format(a, b) for a in range(0, 5) for b in range(1, 10)
]

WORLD_COORDS = [
    # (lon, lat, city)
    (-73.9, 40.7, 'New York'), (2.3, 48.9, 'Paris'), (139.7, 35.7, 'Tokyo'),
    (-0.1, 51.5, 'London'), (28.0, 41.0, 'Istanbul'), (116.4, 39.9, 'Beijing'),
    (37.6, 55.8, 'Moscow'), (-43.2, -22.9, 'Rio'), (72.9, 19.1, 'Mumbai'),
    (-87.6, 41.8, 'Chicago'), (103.8, 1.3, 'Singapore'), (31.2, 30.1, 'Cairo'),
    (18.1, 59.3, 'Stockholm'), (-46.6, -23.5, 'São Paulo'), (4.9, 52.4, 'Amsterdam'),
    (126.9, 37.6, 'Seoul'), (151.2, -33.9, 'Sydney'), (77.2, 28.6, 'Delhi'),
    (-99.1, 19.4, 'Mexico City'), (12.5, 41.9, 'Rome'),
]


class PacketSimulator:
    """
    Streams prediction results as a continuous packet feed.
    Call start() to begin background simulation.
    Call stop() to halt it.
    Access recent packets via get_recent_packets() or alerts via get_alerts().
    """

    WINDOW_SIZE = 200      # sliding window of recent packets
    ALERT_WINDOW = 50      # keep last N alerts

    def __init__(self, model, encoders, feature_names, data_path=None, interval=0.3):
        self.model = model
        self.encoders = encoders
        self.feature_names = feature_names
        self.data_path = data_path or DEFAULT_DATA_PATH
        self.interval = interval          # seconds between packets

        self._lock = threading.Lock()
        self._thread = None
        self._running = False

        # Sliding window of all recent packets (hash-indexed by packet_id)
        self._packet_window: deque = deque(maxlen=self.WINDOW_SIZE)
        self._alert_window: deque = deque(maxlen=self.ALERT_WINDOW)

        # Cumulative stats
        self._stats = {
            'total_packets': 0,
            'total_attacks': 0,
            'start_time': None,
            'packets_per_second': 0.0,
            'last_timestamp': None,
        }
        self._protocol_counts = {'tcp': 0, 'udp': 0, 'icmp': 0}
        self._traffic_history = deque(maxlen=60)  # 1-minute traffic window

        # Load and preprocess test set for simulation
        print("[Simulator] Loading data for simulation ...")
        self._X_test, self._df_test = self._load_test_data()
        self._n_packets = len(self._X_test)
        print(f"[Simulator] {self._n_packets:,} packets ready for simulation")

    def _load_test_data(self):
        """Load the raw dataframe and its encoded X_test for simulation."""
        df = pd.read_csv(self.data_path, names=COLUMN_NAMES)
        df['label'] = df['label'].str.replace('.', '', regex=False)
        df['label'] = df['label'].apply(lambda x: 'normal' if x == 'normal' else 'attack')

        # Encode categoricals using the fitted encoders
        df_enc = df.copy()
        for col in ['protocol_type', 'service', 'flag']:
            if col in self.encoders:
                try:
                    df_enc[col] = self.encoders[col].transform(df_enc[col])
                except Exception:
                    df_enc[col] = 0

        feature_names = [c for c in COLUMN_NAMES if c != 'label']
        X = df_enc[feature_names].values

        # Reset index for iteration
        df = df.reset_index(drop=True)

        return X, df

    def start(self):
        if self._running:
            return
        self._running = True
        self._stats['start_time'] = datetime.now(timezone.utc).isoformat()
        self._thread = threading.Thread(target=self._simulate_loop, daemon=True)
        self._thread.start()
        print("[Simulator] Started background packet simulation")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        print("[Simulator] Stopped")

    def _simulate_loop(self):
        idx = 0
        pps_counter = 0
        pps_window_start = time.time()

        while self._running:
            row_idx = idx % self._n_packets
            features = self._X_test[row_idx].reshape(1, -1)
            raw_row = self._df_test.iloc[row_idx]

            # Prediction + confidence
            prediction = int(self.model.predict(features)[0])
            probas = self.model.predict_proba(features)[0]
            confidence = float(max(probas))

            # Protocol lookup
            protocol = str(raw_row.get('protocol_type', 'tcp'))

            # Build packet dict
            src_ip = random.choice(SIMULATED_IPS)
            dst_ip = random.choice(SIMULATED_IPS)
            geo_dst = random.choice(WORLD_COORDS)
            geo_src = random.choice([c for c in WORLD_COORDS if c != geo_dst])

            ts = datetime.now(timezone.utc).isoformat()
            packet = {
                'id': idx + 1,
                'timestamp': ts,
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'protocol': protocol,
                'service': str(raw_row.get('service', 'http')),
                'src_bytes': int(raw_row.get('src_bytes', 0)),
                'dst_bytes': int(raw_row.get('dst_bytes', 0)),
                'duration': float(raw_row.get('duration', 0)),
                'flag': str(raw_row.get('flag', 'SF')),
                'prediction': prediction,
                'label': 'Attack' if prediction == 1 else 'Normal',
                'confidence': round(confidence * 100, 1),
                'geo': {'lon': geo_dst[0], 'lat': geo_dst[1], 'city': geo_dst[2]},
                'geo_src': {'lon': geo_src[0], 'lat': geo_src[1], 'city': geo_src[2]},
            }

            # Thread-safe update
            with self._lock:
                self._packet_window.append(packet)
                self._stats['total_packets'] = idx + 1
                self._stats['last_timestamp'] = ts
                self._protocol_counts[protocol] = \
                    self._protocol_counts.get(protocol, 0) + 1

                if prediction == 1:
                    self._stats['total_attacks'] += 1
                    alert = {
                        **packet,
                        'severity': 'HIGH' if confidence > 0.9 else 'MEDIUM',
                        'alert_id': f"ALT-{idx+1:05d}",
                    }
                    self._alert_window.append(alert)

                # PPS tracking
                pps_counter += 1
                now = time.time()
                elapsed = now - pps_window_start
                if elapsed >= 1.0:
                    pps = pps_counter / elapsed
                    self._stats['packets_per_second'] = round(pps, 1)
                    # Snapshot for traffic history
                    self._traffic_history.append({
                        'time': ts,
                        'packets': pps_counter,
                        'attacks': self._stats['total_attacks'],
                    })
                    pps_counter = 0
                    pps_window_start = now

            idx += 1
            time.sleep(self.interval)

    # ── Public accessors ────────────────────────────────────────────────────────

    def get_recent_packets(self, n=50):
        with self._lock:
            pkts = list(self._packet_window)
        return pkts[-n:]

    def get_alerts(self, n=20):
        with self._lock:
            alerts = list(self._alert_window)
        return alerts[-n:]

    def get_stats(self):
        with self._lock:
            stats = dict(self._stats)
            stats['attack_rate'] = (
                round(stats['total_attacks'] / stats['total_packets'] * 100, 1)
                if stats['total_packets'] > 0 else 0.0
            )
            stats['protocol_counts'] = dict(self._protocol_counts)
            return stats

    def get_traffic_history(self):
        with self._lock:
            return list(self._traffic_history)
