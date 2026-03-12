import { useMemo } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    Line,
    ZoomableGroup,
} from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Static city coords for fallback display even without live data
const STATIC_NODES = [
    [-73.9, 40.7], [2.3, 48.9], [139.7, 35.7], [-0.1, 51.5],
    [28.0, 41.0], [116.4, 39.9], [37.6, 55.8], [72.9, 19.1],
    [103.8, 1.3], [126.9, 37.6], [151.2, -33.9], [-99.1, 19.4],
];

export default function NetworkMap({ packets }) {
    // Collect unique attack geo coords from recent packets
    const attackNodes = useMemo(() => {
        const seen = new Set();
        const nodes = [];
        for (const p of (packets || [])) {
            if (p.prediction === 1 && p.geo) {
                const key = `${p.geo.lon},${p.geo.lat}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    nodes.push({ lon: p.geo.lon, lat: p.geo.lat, city: p.geo.city, id: p.id });
                }
            }
        }
        return nodes.slice(-30);
    }, [packets]);

    const normalNodes = useMemo(() => {
        const seen = new Set();
        const nodes = [];
        for (const p of (packets || [])) {
            if (p.prediction === 0 && p.geo) {
                const key = `${p.geo.lon},${p.geo.lat}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    nodes.push({ lon: p.geo.lon, lat: p.geo.lat });
                }
            }
        }
        return nodes.slice(-20);
    }, [packets]);

    return (
        <div className="panel" style={{ position: 'relative' }}>
            <div className="panel-header">
                <span className="panel-title">🌐 Global Network Situation</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 9, marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
                    {attackNodes.length} ACTIVE THREATS
                </span>
                <span className="panel-badge red" style={{ marginLeft: 'auto' }}>
                    MONITORING
                </span>
            </div>

            <div className="map-container" style={{ flex: 1 }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 130, center: [20, 30] }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
                        <Geographies geography={GEO_URL}>
                            {({ geographies }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#2d2f33" // Dark charcoal grey land
                                        stroke="#1e1e21" // Darker border
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: 'none' },
                                            hover: { fill: '#3b3e44', outline: 'none' },
                                            pressed: { outline: 'none' },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        {/* Normal traffic nodes — small cyan dots */}
                        {normalNodes.map((n, i) => (
                            <Marker key={`n-${i}`} coordinates={[n.lon, n.lat]}>
                                <circle r={2} fill="rgba(0,210,255,0.5)" stroke="none" />
                            </Marker>
                        ))}

                        {/* Attack lines (lasers/missiles) shooting from source IP to destination IP */}
                        {attackNodes.map((n, i) => {
                            // Default to Top-left orbit if older packets don't have geo_src yet
                            const fromCoords = n.geoSrc ? [n.geoSrc.lon, n.geoSrc.lat] : [-140, 60];
                            return (
                                <Line
                                    key={`l-${n.id || i}`}
                                    from={fromCoords}
                                    to={[n.lon, n.lat]}
                                    stroke="#ff3c3c"
                                    strokeWidth={0.8}
                                    strokeLinecap="round"
                                    style={{
                                        strokeDasharray: '3 3',
                                        animation: 'pulse-glow 0.8s infinite'
                                    }}
                                />
                            );
                        })}

                        {/* Attack nodes — flat orange/red circles */}
                        {attackNodes.map((n, i) => {
                            const isOrange = i % 2 === 0;
                            const color = isOrange ? "#fca510" : "#f83d32";
                            return (
                                <Marker key={`a-${n.id || i}`} coordinates={[n.lon, n.lat]}>
                                    <circle
                                        r={isOrange ? 3.5 : 4.5}
                                        fill={color}
                                        stroke="none"
                                        style={{ animation: `pulse-glow ${1.5 + (i % 3) * 0.4}s infinite alternate` }}
                                    />
                                    {/* Subtle faded outer ring for some nodes */}
                                    {i % 3 === 0 && (
                                        <circle r={8} fill={color} opacity={0.15} stroke="none" />
                                    )}
                                </Marker>
                            );
                        })}

                        {/* Static base nodes */}
                        {STATIC_NODES.map(([lon, lat], i) => (
                            <Marker key={`s-${i}`} coordinates={[lon, lat]}>
                                <circle r={1.5} fill="rgba(0,210,255,0.25)" />
                            </Marker>
                        ))}
                    </ZoomableGroup>
                </ComposableMap>

                {/* Legend */}
                <div style={{
                    position: 'absolute', bottom: 8, left: 12,
                    display: 'flex', gap: 14, alignItems: 'center',
                }}>
                    {[
                        { color: '#f83d32', label: 'High Alert' },
                        { color: '#fca510', label: 'Elevated' },
                        { color: '#00d2ff', label: 'Base' },
                    ].map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
