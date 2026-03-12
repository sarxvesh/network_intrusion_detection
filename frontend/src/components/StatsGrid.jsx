import { Activity, AlertOctagon, Percent, Zap } from 'lucide-react';

const cards = [
    { key: 'total_packets', label: 'Total Packets', icon: Activity, cls: '', fmt: v => v?.toLocaleString() ?? '0' },
    { key: 'total_attacks', label: 'Attacks', icon: AlertOctagon, cls: 'red', fmt: v => v?.toLocaleString() ?? '0' },
    { key: 'attack_rate', label: 'Attack Rate', icon: Percent, cls: 'orange', fmt: v => (v ?? 0) + '%' },
    { key: 'packets_per_second', label: 'Pkts / sec', icon: Zap, cls: 'green', fmt: v => v ?? 0 },
];

export default function StatsGrid({ stats }) {
    return (
        <div className="stats-grid">
            {cards.map(({ key, label, icon: Icon, cls, fmt }) => (
                <div className="stat-card" key={key}>
                    <span className="label">{label}</span>
                    <span className={`value ${cls}`}>{fmt(stats?.[key])}</span>
                    <span className="sub">
                        <Icon size={9} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                        {key === 'total_packets' && `+${stats?.packets_per_second ?? 0}/s`}
                        {key === 'total_attacks' && `${stats?.attack_rate ?? 0}% rate`}
                        {key === 'attack_rate' && 'of all traffic'}
                        {key === 'packets_per_second' && 'live throughput'}
                    </span>
                </div>
            ))}
        </div>
    );
}
