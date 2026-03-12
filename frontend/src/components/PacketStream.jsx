import { useEffect, useRef } from 'react';

function fmt(n) {
    return n > 1024 * 1024
        ? (n / 1024 / 1024).toFixed(1) + 'M'
        : n > 1024
            ? (n / 1024).toFixed(1) + 'K'
            : n;
}

function timeStr(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toISOString().slice(11, 19);
}

export default function PacketStream({ packets }) {
    const listRef = useRef(null);

    // Auto-scroll to top (newest entries appear at top)
    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [packets?.length]);

    const reversed = [...(packets || [])].reverse();

    return (
        <div className="panel">
            <div className="panel-header">
                <span className="panel-title">📡 Packet Stream</span>
                <span className="panel-badge green">LIVE</span>
            </div>

            <div className="packet-header-row">
                <span>#ID</span>
                <span>SRC → DST</span>
                <span>PROTO/SVC</span>
                <span>BYTES</span>
                <span>STATUS</span>
            </div>

            <div className="packet-list" ref={listRef}>
                {reversed.length === 0 ? (
                    <div className="no-data" style={{ paddingTop: 30 }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    reversed.map((p) => (
                        <div
                            key={p.id}
                            className={`packet-row ${p.prediction === 1 ? 'attack' : 'normal'}`}
                        >
                            <span className="packet-id mono">#{p.id}</span>
                            <span className="packet-ips">
                                {p.src_ip} → {p.dst_ip}
                            </span>
                            <span className="packet-proto mono">
                                {(p.protocol || 'tcp').toUpperCase()}/{p.service || '—'}
                            </span>
                            <span className="packet-bytes mono">
                                {fmt(p.src_bytes || 0)}
                            </span>
                            <span className={`packet-label ${p.prediction === 1 ? 'attack' : 'normal'}`}>
                                {p.prediction === 1 ? '⚠ ATK' : '✓ OK'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
