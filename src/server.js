require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const bankRoutes = require('./routes/banks');
const accountRoutes = require('./routes/accounts');
const loanRoutes = require('./routes/loans');
const subsidyRoutes = require('./routes/subsidies');
const notificationRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/subsidies', subsidyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'RRB Banking API' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Database Connection ──────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 RRB Banking Server running on port ${PORT}`);
      console.log(`🌐 Network: http://192.168.0.101:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Running in mock data mode (no MongoDB required)');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 RRB Banking Server running on port ${PORT}`);
      console.log(`🌐 Network: http://192.168.0.101:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    });
  }
};

startServer();

module.exports = app;
