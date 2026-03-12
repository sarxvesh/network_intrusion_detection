import {
    AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#00d2ff', '#ff3c3c', '#00ff9d'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
            padding: '6px 10px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10,
        }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color }}>
                    {p.name}: {p.value}
                </div>
            ))}
        </div>
    );
};

export default function TrafficAnalytics({ history, stats }) {
    // Build chart data from traffic history
    const chartData = (history || []).slice(-30).map((h, i) => ({
        t: `T-${(history.length - i)}s`,
        packets: h.packets || 0,
        attacks: h.attacks || 0,
    }));

    // Protocol breakdown pie data
    const proto = stats?.protocol_counts || { tcp: 0, udp: 0, icmp: 0 };
    const pieData = Object.entries(proto).map(([k, v]) => ({ name: k.toUpperCase(), value: v }));

    return (
        <div className="panel">
            <div className="panel-header">
                <span className="panel-title">📊 Traffic Analytics</span>
                <span className="panel-badge cyan">LIVE</span>
            </div>

            <div className="panel-body" style={{ padding: '4px 0', gap: 0 }}>
                {/* Area chart — traffic over time */}
                <div style={{ flex: '1', minHeight: 0, padding: '0 4px' }}>
                    <div style={{
                        fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1,
                        textTransform: 'uppercase', padding: '4px 8px',
                    }}>
                        Packets / Second History
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cgPkt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00d2ff" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cgAtk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff3c3c" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#ff3c3c" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="t" tick={{ fill: '#2a4a6b', fontSize: 8 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#2a4a6b', fontSize: 8 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="packets" stroke="#00d2ff" fill="url(#cgPkt)" strokeWidth={1.5} dot={false} name="Packets" />
                            <Area type="monotone" dataKey="attacks" stroke="#ff3c3c" fill="url(#cgAtk)" strokeWidth={1.5} dot={false} name="Attacks" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--border-dim)', margin: '0 8px' }} />

                {/* Protocol pie */}
                <div style={{ flex: '0 0 42%', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 8 }}>
                    <div style={{ flex: '0 0 100px', height: 80 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={22} outerRadius={38}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                            Protocol Mix
                        </div>
                        {pieData.map((d, i) => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flex: 1 }}>{d.name}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)' }}>
                                    {d.value.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
