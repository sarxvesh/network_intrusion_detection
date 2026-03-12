export default function AIInsights({ modelInfo }) {
    const accuracy = modelInfo?.accuracy ?? 0;
    const pct = (accuracy * 100).toFixed(2);
    const features = modelInfo?.feature_importances ?? [];
    const maxImp = features[0]?.[1] ?? 1;

    // SVG ring math
    const R = 26;
    const C = 2 * Math.PI * R;
    const filled = (accuracy * C).toFixed(1);

    return (
        <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
                <span className="panel-title">🤖 AI Insights</span>
                <span className="panel-badge cyan">RANDOM FOREST</span>
            </div>

            <div className="panel-body" style={{ overflowY: 'auto' }}>
                {/* Accuracy ring */}
                <div className="insight-section">
                    <h4>Model Accuracy</h4>
                    <div className="accuracy-ring">
                        <div className="ring-container">
                            <svg viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="30" cy="30" r={R} fill="none" stroke="var(--bg-card)" strokeWidth="5" />
                                <circle
                                    cx="30" cy="30" r={R}
                                    fill="none"
                                    stroke="var(--neon-green)"
                                    strokeWidth="5"
                                    strokeDasharray={`${filled} ${C}`}
                                    strokeLinecap="round"
                                    style={{ filter: 'drop-shadow(0 0 4px var(--neon-green))' }}
                                />
                            </svg>
                            <div className="ring-text">
                                <span className="ring-pct">{pct}%</span>
                                <span className="ring-sub">ACC</span>
                            </div>
                        </div>

                        <div className="acc-info">
                            <div className="model-name">Random Forest</div>
                            <div className="model-desc">n_estimators: {modelInfo?.n_estimators ?? 100}</div>
                            <div className="model-desc" style={{ marginTop: 3 }}>
                                Train: {(modelInfo?.n_train ?? 0).toLocaleString()} samples
                            </div>
                            <div className="model-desc">
                                Test: {(modelInfo?.n_test ?? 0).toLocaleString()} samples
                            </div>
                        </div>
                    </div>
                </div>

                {/* Classification metrics */}
                {modelInfo?.report && (
                    <div className="insight-section">
                        <h4>Detection Metrics</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {['normal', 'attack'].map(cls => {
                                const r = modelInfo.report[cls] ?? {};
                                return (
                                    <div key={cls} style={{
                                        background: 'var(--bg-card)',
                                        border: `1px solid ${cls === 'attack' ? 'rgba(255,60,60,0.2)' : 'rgba(0,210,255,0.15)'}`,
                                        borderRadius: 4, padding: '6px 8px',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)', fontSize: 9,
                                            color: cls === 'attack' ? 'var(--neon-red)' : 'var(--neon-cyan)',
                                            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
                                        }}>
                                            {cls}
                                        </div>
                                        {[['Precision', 'precision'], ['Recall', 'recall'], ['F1', 'f1-score']].map(([label, key]) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                                                    {((r[key] ?? 0) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top feature importances */}
                {features.length > 0 && (
                    <div className="insight-section" style={{ borderBottom: 'none' }}>
                        <h4>Top Feature Importances</h4>
                        <div className="feat-bar-list">
                            {features.slice(0, 10).map(([name, imp]) => (
                                <div className="feat-bar" key={name}>
                                    <span className="feat-name">{name}</span>
                                    <div className="feat-track">
                                        <div className="feat-fill" style={{ width: `${(imp / maxImp) * 100}%` }} />
                                    </div>
                                    <span className="feat-pct">{(imp * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!modelInfo?.accuracy && (
                    <div className="no-data" style={{ paddingTop: 30, flexDirection: 'column', gap: 8 }}>
                        <div className="spinner" />
                        <span style={{ fontSize: 10, marginTop: 8 }}>LOADING MODEL...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
