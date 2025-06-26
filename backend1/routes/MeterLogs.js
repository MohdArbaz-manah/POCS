const express = require('express');
const router = express.Router();
const MeterLog = require('../models/MeterLog');
const MeterLogsHourly = require('../models/MeterLogsHourly'); // Hourly log

// ✅ GET all meter logs
router.get('/', async (req, res) => {
  try {
    const logs = await MeterLog.find({});
    console.log(logs, "======>");
    res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching meter logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/meterhourslogs', async (req, res) => {
  try {
    const logs = await MeterHourlyLog.find({});
    res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching hourly logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
})
router.post('/', async (req, res) => {
  try {
    const newLog = new MeterLog(req.body);
    const savedLog = await newLog.save();
    res.status(201).json(savedLog);
  } catch (err) {
    console.error('Error saving meter log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/meterhourlogs', async (req, res) => {
  try {
    const newLog = new MeterLogsHourly(req.body);
    const savedLog = await newLog.save();
    res.status(201).json(savedLog);
  } catch (err) {
    console.error('Error saving meter log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;
