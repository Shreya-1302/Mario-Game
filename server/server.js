import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mario';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection status
let dbConnected = false;

// Attempt to connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('💚 Connected to MongoDB successfully.');
    dbConnected = true;
  })
  .catch((err) => {
    console.warn('\n⚠️  WARNING: Could not connect to MongoDB.');
    console.warn('   Ensure MongoDB is running locally or check MONGO_URI in server/.env');
    console.warn('   The server will run in OFFLINE / DB-DEMO mode.\n');
    dbConnected = false;
  });

// Routes
// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'offline_demo_mode',
    timestamp: new Date()
  });
});

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/ai', aiRoutes);

// Listen
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

