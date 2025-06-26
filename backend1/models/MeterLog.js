const mongoose = require('mongoose');

const MeterDataSchema = new mongoose.Schema({
  rtc: Date,
  cumulative_energy_kwh_export: String,
  cumulative_energy_kvah_export: String,
  cumulative_energy_kwh_import: String,
  cumulative_energy_kvah_import: String
});

const MeterLogSchema = new mongoose.Schema({
  timestamp: Date,
  user_id: String,
  ip_address: String,
  device_id: String,
  request: String,
  response: String,
  meter_data: [MeterDataSchema]
});

module.exports = mongoose.model('MeterLog', MeterLogSchema);
