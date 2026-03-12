function timeStr(iso) {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(11, 19);
}

export default function AlertsPanel({ alerts }) {
    const sorted = [...(alerts || [])].reverse();

    return (
        <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
                <span className="panel-title">⚠ Intrusion Alerts</span>
                <span
                    className="panel-badge red"
                    style={{ animation: sorted.length > 0 ? 'pulse-glow 1s infinite' : 'none' }}
                >
                    {sorted.length} ALERTS
                </span>
            </div>

            <div className="alert-list">
                {sorted.length === 0 ? (
                    <div className="no-data" style={{ paddingTop: 20 }}>
                        NO ALERTS DETECTED
                    </div>
                ) : (
                    sorted.map((a) => (
                        <div key={a.alert_id || a.id} className={`alert-card ${a.severity || 'HIGH'}`}>
                            <div className="alert-header">
                                <span className="alert-id">{a.alert_id || `PKT-${a.id}`}</span>
                                <span className={`alert-sev ${a.severity || 'HIGH'}`}>
                                    {a.severity || 'HIGH'}
                                </span>
                                <span className="alert-time">{timeStr(a.timestamp)}</span>
                            </div>
                            <div className="alert-detail">
                                Proto: <span>{(a.protocol || 'tcp').toUpperCase()}</span>
                                {' · '}SVC: <span>{a.service || '—'}</span>
                                {' · '}Conf: <span>{a.confidence}%</span>
                            </div>
                            <div className="alert-detail" style={{ marginTop: 2 }}>
                                <span>{a.src_ip}</span> → <span>{a.dst_ip}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
