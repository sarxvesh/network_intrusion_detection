"""
INIDS - Data Processing Module
Loads and preprocesses the KDD Cup 1999 dataset.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

COLUMN_NAMES = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
    'land', 'wrong_fragment', 'urgent', 'hot', 'num_failed_logins', 'logged_in',
    'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login',
    'is_guest_login', 'count', 'srv_count', 'serror_rate', 'srv_serror_rate',
    'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate',
    'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count',
    'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate',
    'dst_host_serror_rate', 'dst_host_srv_serror_rate',
    'dst_host_rerror_rate', 'dst_host_srv_rerror_rate', 'label'
]

CATEGORICAL_COLUMNS = ['protocol_type', 'service', 'flag']

# Default path relative to project root
DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'data', 'kddcup.data_10_percent'
)


def load_and_preprocess(data_path=None, test_size=0.2, random_state=42):
    """
    Load and preprocess the KDD Cup dataset.

    Returns:
        X_train, X_test, y_train, y_test (numpy arrays)
        encoders (dict of LabelEncoder per categorical column)
        feature_names (list of feature column names)
        label_map (dict of original label -> binary label)
        attack_label_counts (pd.Series of original attack labels)
    """
    if data_path is None:
        data_path = DEFAULT_DATA_PATH

    print(f"[DataProcessing] Loading dataset from {data_path} ...")
    df = pd.read_csv(data_path, names=COLUMN_NAMES)
    print(f"[DataProcessing] Loaded {len(df):,} rows, {df.shape[1]} columns")

    # Clean trailing dots from labels (e.g. "normal." -> "normal")
    df['label'] = df['label'].str.replace('.', '', regex=False)

    # Store original attack type distribution for stats
    attack_label_counts = df['label'].value_counts()

    # Binary classification: normal vs. attack
    df['label'] = df['label'].apply(lambda x: 'normal' if x == 'normal' else 'attack')

    print(f"[DataProcessing] Label distribution:\n{df['label'].value_counts().to_string()}")

    # Encode categorical columns - fit a separate encoder per column
    encoders = {}
    for col in CATEGORICAL_COLUMNS:
        enc = LabelEncoder()
        df[col] = enc.fit_transform(df[col])
        encoders[col] = enc

    # Encode binary label
    df['label'] = df['label'].map({'normal': 0, 'attack': 1})

    feature_names = [c for c in COLUMN_NAMES if c != 'label']
    X = df[feature_names].values
    y = df['label'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    print(f"[DataProcessing] Train: {X_train.shape}, Test: {X_test.shape}")
    return X_train, X_test, y_train, y_test, encoders, feature_names, attack_label_counts


def encode_packet(packet_dict, encoders, feature_names):
    """
    Encode a single raw packet dictionary for model inference.
    Unknown categories fall back to 0.
    """
    row = []
    for col in feature_names:
        val = packet_dict.get(col, 0)
        if col in encoders:
            try:
                val = encoders[col].transform([val])[0]
            except (ValueError, KeyError):
                val = 0
        row.append(float(val))
    return np.array([row])


if __name__ == '__main__':
    X_train, X_test, y_train, y_test, encoders, feature_names, attacks = load_and_preprocess()
    print(f"\nFeatures ({len(feature_names)}): {feature_names[:5]} ...")
    print(f"Attack types found: {len(attacks)}")