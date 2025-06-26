const mongoose = require('mongoose');

const MeterDataSchema = new mongoose.Schema({
  rtc: Date,
  average_current: String,
  block_energy_kwh_import: String,
  block_energy_kvah_import: String,
  average_voltage: String
});

const MeterdailyLogs = new mongoose.Schema({
  timestamp: Date,
  user_id: String,
  ip_address: String,
  device_id: String,
  request: String,
  response: String,
  meter_data: [MeterDataSchema]
});

module.exports = mongoose.model('MeterLogsHourly', MeterdailyLogs);
