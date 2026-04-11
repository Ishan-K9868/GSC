import { getFirebaseStatus } from './firebase';
import { hasGeminiApiKey, getModelName } from '../services/geminiClient';

type ReadinessCheck = {
  ok: boolean;
  message: string;
};

export type RuntimeReadinessReport = {
  ok: boolean;
  checks: {
    firebase: ReadinessCheck;
    gemini: ReadinessCheck;
    storage: ReadinessCheck;
    cors: ReadinessCheck;
  };
  config: {
    nodeEnv: string;
    allowedOrigins: string[];
    allowLocalUploadFallback: boolean;
    runtimeSchedulersEnabled: boolean;
    models: {
      flash: string;
      pro: string;
    };
  };
};

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;

  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) {
    return isProduction() ? [] : ['http://localhost:5173'];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function allowLocalUploadFallback(): boolean {
  return envBool('ALLOW_LOCAL_UPLOAD_FALLBACK', !isProduction());
}

export function runtimeSchedulersEnabled(): boolean {
  return envBool('ENABLE_RUNTIME_SCHEDULERS', true);
}

export function getRuntimeReadinessReport(): RuntimeReadinessReport {
  const firebase = getFirebaseStatus();
  const allowedOrigins = getAllowedOrigins();
  const allowLocalFallback = allowLocalUploadFallback();
  const storageConfigured = Boolean(process.env.GCS_BUCKET_NAME);

  const checks = {
    firebase: {
      ok: !firebase.isMock,
      message: firebase.isMock
        ? firebase.lastError || 'Firebase is running in mock mode.'
        : `Firebase ready via ${firebase.credentialSource}`,
    },
    gemini: {
      ok: hasGeminiApiKey(),
      message: hasGeminiApiKey() ? 'Gemini API key configured' : 'GEMINI_API_KEY is missing',
    },
    storage: {
      ok: storageConfigured || allowLocalFallback,
      message: storageConfigured
        ? `Cloud bucket configured (${process.env.GCS_BUCKET_NAME})`
        : allowLocalFallback
          ? 'Cloud bucket missing; local upload fallback enabled'
          : 'GCS_BUCKET_NAME missing and local upload fallback disabled',
    },
    cors: {
      ok: allowedOrigins.length > 0,
      message:
        allowedOrigins.length > 0
          ? `Allowed origins: ${allowedOrigins.join(', ')}`
          : 'ALLOWED_ORIGINS is empty',
    },
  };

  return {
    ok: Object.values(checks).every((check) => check.ok),
    checks,
    config: {
      nodeEnv: process.env.NODE_ENV || 'development',
      allowedOrigins,
      allowLocalUploadFallback: allowLocalFallback,
      runtimeSchedulersEnabled: runtimeSchedulersEnabled(),
      models: {
        flash: getModelName('flash'),
        pro: getModelName('pro'),
      },
    },
  };
}

export function assertProductionRuntimeReadiness(): void {
  if (!isProduction()) return;

  const report = getRuntimeReadinessReport();
  if (report.ok) return;

  const failures = Object.entries(report.checks)
    .filter(([, check]) => !check.ok)
    .map(([name, check]) => `${name}: ${check.message}`);

  throw new Error(`Production readiness checks failed: ${failures.join(' | ')}`);
}
