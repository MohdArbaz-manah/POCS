"use client";
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Zap, Shield, Plus, Settings, Bell, Activity, Clock,
} from 'lucide-react';

// ==== Define Types ====
type Meter = {
  id: string;
  voltage: number;
  temperEvent: boolean;
  location: string;
  createdAt: string;
};

type Alert = {
  id: string;
  type: 'HIGH_VOLTAGE' | 'LOW_VOLTAGE' | 'TEMPER_EVENT' | string;
  message: string;
  timestamp: string;
  smsStatus: 'SENT' | 'FAILED' | string;
  whatsappStatus: 'SENT' | 'FAILED' | string;
};

type VoltageLimits = {
  minVoltage: number;
  maxVoltage: number;
};

type Config = {
  voltageLimits: {
    MIN_VOLTAGE: number;
    MAX_VOLTAGE: number;
  };
};

const MeterManagementSystem: React.FC = () => {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [config, setConfig] = useState<Config>({ voltageLimits: { MIN_VOLTAGE: 200, MAX_VOLTAGE: 250 } });
  const [activeTab, setActiveTab] = useState<any>('meters');
  const [loading, setLoading] = useState(false);

  const [newMeter, setNewMeter] = useState<Omit<Meter, 'id' | 'createdAt'>>({
    voltage: 0,
    temperEvent: false,
    location: ''
  });

  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);

  const [voltageLimits, setVoltageLimits] = useState<VoltageLimits>({
    minVoltage: 200,
    maxVoltage: 250,
  });

  const API_BASE = 'http://localhost:3001/api';

  const fetchMeters = async () => {
    try {
      const response = await fetch(`${API_BASE}/meters`);
      const data: Meter[] = await response.json();
      setMeters(data);
    } catch (error) {
      console.error('Error fetching meters:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts`);
      const data: Alert[] = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const data: Config = await response.json();
      setConfig(data);
      setVoltageLimits({
        minVoltage: data.voltageLimits.MIN_VOLTAGE,
        maxVoltage: data.voltageLimits.MAX_VOLTAGE
      });
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  useEffect(() => {
    fetchMeters();
    fetchAlerts();
    fetchConfig();

    const interval = setInterval(() => {
      fetchMeters();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const addMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/meters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeter),
      });

      const result = await response.json();
      if (response.ok) {
        setNewMeter({ voltage: 0, temperEvent: false, location: '' });
        fetchMeters();
        fetchAlerts();
        if (result.alerts?.length > 0) {
          alert(`Meter added successfully! ${result.alerts.length} alert(s) triggered and sent to admin.`);
        }
      } else {
        alert('Error adding meter: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding meter:', error);
      alert('Error adding meter');
    } finally {
      setLoading(false);
    }
  };

  const updateMeter = async (meterId: string, updates: Partial<Meter>) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/meters/${meterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      if (response.ok) {
        fetchMeters();
        fetchAlerts();
        setEditingMeter(null);
        if (result.alerts?.length > 0) {
          alert(`Meter updated successfully! ${result.alerts.length} alert(s) triggered and sent to admin.`);
        }
      } else {
        alert('Error updating meter: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating meter:', error);
      alert('Error updating meter');
    } finally {
      setLoading(false);
    }
  };

  const updateVoltageLimits = async () => {
    try {
      const response = await fetch(`${API_BASE}/config/voltage-limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voltageLimits)
      });
      if (response.ok) {
        alert('Voltage limits updated successfully!');
        fetchConfig();
      }
    } catch (error) {
      console.error('Error updating voltage limits:', error);
      alert('Error updating voltage limits');
    }
  };

  const sendTestAlert = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/test-alert`, {
        method: 'POST'
      });

      const result = await response.json();
      if (response.ok) {
        alert('Test alerts sent successfully! Check your WhatsApp and SMS.');
      } else {
        alert('Error sending test alert: ' + result.error);
      }
    } catch (error) {
      console.error('Error sending test alert:', error);
      alert('Error sending test alert');
    } finally {
      setLoading(false);
    }
  };

  const getMeterStatus = (meter: Meter) => {
    const isHighVoltage = meter.voltage > (config.voltageLimits?.MAX_VOLTAGE || 250);
    const isLowVoltage = meter.voltage < (config.voltageLimits?.MIN_VOLTAGE || 200);
    const hasTemperEvent = meter.temperEvent;

    if (hasTemperEvent) return { status: 'TAMPERED', color: 'text-purple-600' };
    if (isHighVoltage) return { status: 'HIGH VOLTAGE', color: 'text-red-600' };
    if (isLowVoltage) return { status: 'LOW VOLTAGE', color: 'text-yellow-600' };
    return { status: 'NORMAL', color: 'text-green-600' };
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'HIGH_VOLTAGE':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'LOW_VOLTAGE':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'TEMPER_EVENT':
        return 'bg-purple-100 border-purple-500 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'HIGH_VOLTAGE':
        return <Zap className="w-5 h-5" />;
      case 'LOW_VOLTAGE':
        return <AlertTriangle className="w-5 h-5" />;
      case 'TEMPER_EVENT':
        return <Shield className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

 

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Meter Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Total Meters: {meters.length} | Total Alerts: {alerts.length}
              </div>
              <button
                onClick={sendTestAlert}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          {[
            { id: 'meters', label: 'Meters', icon: Activity },
            { id: 'alerts', label: 'Alerts', icon: Bell },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Meters Tab */}
        {activeTab === 'meters' && (
          <div className="space-y-6">
            {/* Add Meter Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Add New Meter</span>
              </h2>
              <form onSubmit={addMeter} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voltage (V)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMeter.voltage}
                    onChange={(e) => setNewMeter({...newMeter, voltage: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter voltage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newMeter.location}
                    onChange={(e) => setNewMeter({...newMeter, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter location"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="temperEvent"
                    checked={newMeter.temperEvent}
                    onChange={(e) => setNewMeter({...newMeter, temperEvent: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="temperEvent" className="text-sm font-medium text-gray-700">
                    Temper Event
                  </label>
                </div>
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Meter'}
                  </button>
                </div>
              </form>
            </div>

            {/* Meters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meters.map((meter) => {
                const meterStatus = getMeterStatus(meter);
                return (
                  <div key={meter.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{meter.id}</h3>
                        <p className="text-gray-600 text-sm">{meter.location}</p>
                      </div>
                      <span className={`text-sm font-medium ${meterStatus.color}`}>
                        {meterStatus.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voltage:</span>
                        <span className="font-medium">{meter.voltage}V</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Temper Event:</span>
                        <span className={`font-medium ${meter.temperEvent ? 'text-red-600' : 'text-green-600'}`}>
                          {meter.temperEvent ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-sm">
                          {new Date(meter.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setEditingMeter(meter)}
                      className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200"
                    >
                      Edit Meter
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Alert History</span>
              </h2>
              
              {alerts.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No alerts found</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border-l-4 p-4 rounded-lg ${getAlertColor(alert.type)}`}
                    >
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{alert.type.replace('_', ' ')}</h3>
                            <div className="flex items-center space-x-2 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(alert.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex space-x-4 text-xs">
                            <span className={`px-2 py-1 rounded ${
                              alert.smsStatus === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              SMS: {alert.smsStatus}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              alert.whatsappStatus === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              WhatsApp: {alert.whatsappStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Voltage Limits Configuration</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Voltage (V)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={voltageLimits.minVoltage}
                    onChange={(e) => setVoltageLimits({...voltageLimits, minVoltage: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Voltage (V)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={voltageLimits.maxVoltage}
                    onChange={(e) => setVoltageLimits({...voltageLimits, maxVoltage: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <button
                onClick={updateVoltageLimits}
                className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Update Limits
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Meter Modal */}
      {editingMeter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Meter {editingMeter.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voltage (V)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMeter.voltage}
                  onChange={(e) => setEditingMeter({...editingMeter, voltage: parseFloat(e.target.value)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editingMeter.location}
                  onChange={(e) => setEditingMeter({...editingMeter, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editTemperEvent"
                  checked={editingMeter.temperEvent}
                  onChange={(e) => setEditingMeter({...editingMeter, temperEvent: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="editTemperEvent" className="text-sm font-medium text-gray-700">
                  Temper Event
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => updateMeter(editingMeter.id, {
                  voltage: editingMeter.voltage,
                  temperEvent: editingMeter.temperEvent,
                  location: editingMeter.location
                })}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setEditingMeter(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeterManagementSystem;