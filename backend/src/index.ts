/**
 * SevaSetu Backend - Main Entry Point
 * PRD: 5.1 SEVA Intake Engine - Backend API server
 * 
 * Handles:
 * - Need report intake API
 * - Photo upload and Gemini Vision analysis
 * - Need classification with Gemini
 * - Authentication via Firebase
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { getFirebaseStatus, initializeFirebase, verifyFirebaseRuntimeAvailability } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { intakeRouter } from './routes/intake';
import { uploadRouter } from './routes/upload';
import { classificationRouter } from './routes/classification';
import mapRouter from './routes/map';
import dispatchRouter from './routes/dispatch';
import dashboardRouter from './routes/dashboard';
import volunteerAppRouter from './routes/volunteerApp';
import geminiRouter from './routes/gemini';
import csrRouter from './routes/csr';
import panchayatRouter from './routes/panchayat';
import crisisRouter from './routes/crisis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
initializeFirebase();
void verifyFirebaseRuntimeAvailability();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/deps', (req, res) => {
  res.json({
    success: true,
    data: {
      firebase: getFirebaseStatus(),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/intake', intakeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/classification', classificationRouter);
app.use('/api/map', mapRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/volunteer-app', volunteerAppRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/csr', csrRouter);
app.use('/api/panchayat', panchayatRouter);
app.use('/api/crisis', crisisRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SevaSetu Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
