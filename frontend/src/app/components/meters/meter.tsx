""
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [meters, setMeters] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMeter, setNewMeter] = useState({
    meterId: '',
    name: '',
    location: '',
    maxVoltageLimit: 240,
    minVoltageLimit: 200
  });

  useEffect(() => {
    fetchMeters();
    fetchAlerts();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchMeters();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchMeters = async () => {
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      setMeters(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meters:', error);
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleCreateMeter = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/meters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMeter),
      });

      if (response.ok) {
        setNewMeter({
          meterId: '',
          name: '',
          location: '',
          maxVoltageLimit: 240,
          minVoltageLimit: 200
        });
        fetchMeters();
        alert('Meter created successfully!');
      }
    } catch (error) {
      console.error('Error creating meter:', error);
      alert('Error creating meter');
    }
  };

  const testAlert = async (meterId) => {
    try {
      const response = await fetch('/api/test-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meterId }),
      });

      if (response.ok) {
        alert('Test alert sent successfully!');
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error sending test alert:', error);
      alert('Error sending test alert');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PUT',
      });

      if (response.ok) {
        fetchAlerts();
        alert('Alert resolved successfully!');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert');
    }
  };

  const getVoltageStatus = (voltage, min, max) => {
    if (voltage > max) return { status: 'HIGH', color: '#ef4444', text: '🔥 HIGH' };
    if (voltage < min) return { status: 'LOW', color: '#f59e0b', text: '⚠️ LOW' };
    return { status: 'NORMAL', color: '#10b981', text: '✅ NORMAL' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>Meter Management System</title>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ color: '#1e293b', fontSize: '2.5rem', marginBottom: '10px' }}>
            ⚡ Meter Management System
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            Real-time monitoring with automated alerts
          </p>
        </header>

        {/* Add New Meter Form */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '10px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#1e293b', marginBottom: '20px', fontSize: '1.5rem' }}>
            📝 Add New Meter
          </h2>
          <form onSubmit={handleCreateMeter} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <input
              type="text"
              placeholder="Meter ID"
              value={newMeter.meterId}
              onChange={(e) => setNewMeter({...newMeter, meterId: e.target.value})}
              required
              style={{ padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
            <input
              type="text"
              placeholder="Meter Name"
              value={newMeter.name}
              onChange={(e) => setNewMeter({...newMeter, name: e.target.value})}
              required
              style={{ padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
            <input
              type="text"
              placeholder="Location"
              value={newMeter.location}
              onChange={(e) => setNewMeter({...newMeter, location: e.target.value})}
              required
              style={{ padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
            <input
              type="number"
              placeholder="Max Voltage"
              value={newMeter.maxVoltageLimit}
              onChange={(e) => setNewMeter({...newMeter, maxVoltageLimit: Number(e.target.value)})}
              style={{ padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
            <input
              type="number"
              placeholder="Min Voltage"
              value={newMeter.minVoltageLimit}
              onChange={(e) => setNewMeter({...newMeter, minVoltageLimit: Number(e.target.value)})}
              style={{ padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ➕ Add Meter
            </button>
          </form>
        </div>

        {/* Meters Grid */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '20px', fontSize: '1.5rem' }}>
            📊 Active Meters ({meters.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {meters.map((meter) => {
              const voltageStatus = getVoltageStatus(meter.currentVoltage, meter.minVoltageLimit, meter.maxVoltageLimit);
              return (
                <div
                  key={meter._id}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: voltageStatus.status !== 'NORMAL' ? `3px solid ${voltageStatus.color}` : '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ color: '#1e293b', margin: 0, fontSize: '1.2rem' }}>{meter.name}</h3>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: voltageStatus.color
                      }}
                    >
                      {voltageStatus.text}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      <strong>ID:</strong> {meter.meterId}
                    </p>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      <strong>Location:</strong> {meter.location}
                    </p>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      <strong>Current Voltage:</strong> 
                      <span style={{ color: voltageStatus.color, fontWeight: 'bold', marginLeft: '5px' }}>
                        {meter.currentVoltage}V
                      </span>
                    </p>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      <strong>Range:</strong> {meter.minVoltageLimit}V - {meter.maxVoltageLimit}V
                    </p>
                  </div>

                  <button
                    onClick={() => testAlert(meter.meterId)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🧪 Test Alert
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '10px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ color: '#1e293b', marginBottom: '20px', fontSize: '1.5rem' }}>
            🚨 Recent Alerts ({alerts.length})
          </h2>
          
          {alerts.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
              No alerts yet. System is monitoring...
            </p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert._id}
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: alert.resolvedAt ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${alert.resolvedAt ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>
                        {alert.meterName} ({alert.meterId})
                      </h4>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#64748b' }}>
                        <strong>Type:</strong> {alert.alertType} | 
                        <strong> Value:</strong> {alert.currentValue}V | 
                        <strong> Threshold:</strong> {alert.threshold}V
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#64748b' }}>
                        <strong>Sent via:</strong> {alert.sentVia.join(', ')} | 
                        <strong> Status:</strong> {alert.status}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#9ca3af' }}>
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!alert.resolvedAt && (
                      <button
                        onClick={() => resolveAlert(alert._id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '10px'
                        }}
                      >
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}