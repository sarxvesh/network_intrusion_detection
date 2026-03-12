import { useState, useEffect } from 'react';
import axios from 'axios';

import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import NetworkMap from './components/NetworkMap';
import PacketStream from './components/PacketStream';
import TrafficAnalytics from './components/TrafficAnalytics';
import AlertsPanel from './components/AlertsPanel';
import AIInsights from './components/AIInsights';

import './index.css';

const API = 'http://localhost:5000/api';

export default function App() {
  const [stats, setStats] = useState(null);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);

  // Poll API every 1 second
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [stRes, pkRes, alRes, hsRes] = await Promise.all([
          axios.get(`${API}/stats`),
          axios.get(`${API}/traffic?n=100`),
          axios.get(`${API}/alerts?n=50`),
          axios.get(`${API}/traffic-history`),
        ]);

        if (!active) return;
        setStats(stRes.data);
        setPackets(pkRes.data.packets);
        setAlerts(alRes.data.alerts);
        setHistory(hsRes.data.history);
      } catch (err) {
        console.error("API Error", err);
      }
    };

    // Fetch model info once
    axios.get(`${API}/model-info`)
      .then(res => setModelInfo(res.data))
      .catch(console.error);

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app">
      <Header stats={stats} />

      <div className="main-content">
        {/* Top half: Map */}
        <div className="map-row">
          <NetworkMap packets={packets} />
        </div>

        {/* Middle sliver: Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Bottom half: 3 columns */}
        <div className="bottom-row">
          <PacketStream packets={packets} />
          <TrafficAnalytics history={history} stats={stats} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <AlertsPanel alerts={alerts} />
            <AIInsights modelInfo={modelInfo} />
          </div>
        </div>
      </div>
    </div>
  );
}
