import { useState, useEffect } from 'react';
import { Shield, Wifi, AlertTriangle } from 'lucide-react';

export default function Header({ stats }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const attackRate = stats?.attack_rate ?? 0;
    const defconLevel = attackRate > 40 ? 3 : attackRate > 20 ? 4 : 5;

    return (
        <header className="header">
            <div className="header-brand">
                <Shield size={16} color="var(--neon-cyan)" />
                <span>INIDS</span>
                <span className="version">MONITOR v1.0</span>
            </div>

            <div className="live-badge">
                <span className="live-dot" />
                <span>LIVE</span>
            </div>

            <div className={`defcon-badge level-${defconLevel}`}>
                ⚠ DEFCON {defconLevel}
            </div>

            <div className="header-spacer" />

            <div className="header-stat">
                <span className="label">Packets</span>
                <span className="value mono">
                    {(stats?.total_packets ?? 0).toLocaleString()}
                </span>
            </div>

            <div className="header-stat">
                <span className="label">Attacks</span>
                <span className="value attack mono">
                    {(stats?.total_attacks ?? 0).toLocaleString()}
                </span>
            </div>

            <div className="header-stat">
                <span className="label">Rate</span>
                <span className="value mono">
                    {stats?.attack_rate ?? 0}%
                </span>
            </div>

            <div className="header-stat">
                <span className="label">Pkt/s</span>
                <span className="value mono">
                    {stats?.packets_per_second ?? 0}
                </span>
            </div>

            <div className="header-stat">
                <span className="label">Accuracy</span>
                <span className="value mono" style={{ color: 'var(--neon-green)' }}>
                    {stats?.model_accuracy
                        ? (stats.model_accuracy * 100).toFixed(1) + '%'
                        : '—'}
                </span>
            </div>

            <div className="clock mono">
                {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </div>
        </header>
    );
}
