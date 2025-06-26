const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const meterLogRoutes = require('./routes/MeterLogs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors(
  {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST','PUT', 'DELETE'],
    options: true,
    credentials: true
  }
));
app.use(express.json());

// Routes
app.use('/api/meters', meterLogRoutes);
// MongoDB Connection
mongoose.connect('mongodb://localhost:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => console.error('MongoDB connection error:', err));
