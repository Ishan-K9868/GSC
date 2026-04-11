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

// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { getFirebaseStatus, initializeFirebase, verifyFirebaseRuntimeAvailability } from './config/firebase';
import { getModelName, hasGeminiApiKey } from './services/geminiClient';
import {
  allowLocalUploadFallback,
  assertProductionRuntimeReadiness,
  getAllowedOrigins,
  getRuntimeReadinessReport,
  isProduction,
  runtimeSchedulersEnabled,
} from './config/runtime';
import { runUrgencyDecay } from './scripts/urgencyDecay';
import { checkInventoryAlerts } from './services/inventoryEngine';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { aiLimiter, authLimiter, globalApiLimiter, uploadLimiter } from './middleware/rateLimit';
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
import inventoryRouter from './routes/inventory';

const app = express();
const PORT = process.env.PORT || 3001;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const allowedOrigins = getAllowedOrigins();

function scheduleRecurringTask(taskName: string, intervalMs: number, runner: () => Promise<unknown>) {
  const execute = async () => {
    try {
      const result = await runner();
      console.log(`[scheduler] ${taskName} completed`, result ?? '');
    } catch (error) {
      console.error(`[scheduler] ${taskName} failed`, error);
    }
  };

  void execute();
  return setInterval(() => {
    void execute();
  }, intervalMs);
}

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(requestContext);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/deps', (req, res) => {
  const readiness = getRuntimeReadinessReport();

  res.json({
    success: readiness.ok,
    data: {
      firebase: getFirebaseStatus(),
      gemini: {
        configured: hasGeminiApiKey(),
        flashModel: getModelName('flash'),
        proModel: getModelName('pro'),
      },
      nodeEnv: process.env.NODE_ENV || 'development',
      readiness,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/ready', (req, res) => {
  const readiness = getRuntimeReadinessReport();
  res.status(readiness.ok ? 200 : 503).json({
    success: readiness.ok,
    data: readiness,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', globalApiLimiter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/intake', intakeRouter);
app.use('/api/upload', uploadLimiter, uploadRouter);
app.use('/api/classification', aiLimiter, classificationRouter);
app.use('/api/map', mapRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/volunteer-app', volunteerAppRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/gemini', aiLimiter, geminiRouter);
app.use('/api/csr', csrRouter);
app.use('/api/panchayat', panchayatRouter);
app.use('/api/crisis', crisisRouter);

// Error handling
app.use(errorHandler);

async function bootstrap() {
  initializeFirebase();
  await verifyFirebaseRuntimeAvailability();
  assertProductionRuntimeReadiness();

  if (runtimeSchedulersEnabled()) {
    scheduleRecurringTask('urgency_decay', THIRTY_MINUTES_MS, runUrgencyDecay);
    scheduleRecurringTask('inventory_alerts', ONE_HOUR_MS, checkInventoryAlerts);
  }

  app.listen(PORT, () => {
    const firebaseStatus = getFirebaseStatus();
    const readiness = getRuntimeReadinessReport();

    console.log(`🚀 SevaSetu Backend running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Firebase mode: ${firebaseStatus.mode} (${firebaseStatus.credentialSource})`);
    console.log(`🤖 Gemini models: flash=${getModelName('flash')} | pro=${getModelName('pro')} | configured=${hasGeminiApiKey()}`);
    console.log(`🌐 Allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'none'}`);
    console.log(`📦 Upload fallback: ${allowLocalUploadFallback() ? 'local fallback enabled' : 'cloud only'}`);
    console.log(`⏱️ Runtime schedulers: ${runtimeSchedulersEnabled() ? 'enabled (single instance only)' : 'disabled'}`);

    if (!readiness.ok && !isProduction()) {
      const failedChecks = Object.entries(readiness.checks)
        .filter(([, check]) => !check.ok)
        .map(([name, check]) => `${name}: ${check.message}`)
        .join(' | ');
      console.warn(`⚠️ Runtime readiness degraded: ${failedChecks}`);
    }
  });
}

void bootstrap().catch((error) => {
  console.error('❌ Backend bootstrap failed:', error);
  process.exit(1);
});

export default app;
