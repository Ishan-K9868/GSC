/**
 * Firebase Admin SDK Configuration
 * PRD: 5.1 SEVA Intake Engine - Firebase integration for Firestore, Auth, Storage
 */

import * as admin from 'firebase-admin';

type FirebaseMode = 'real' | 'mock';
type FirebaseCredentialSource = 'google_application_credentials' | 'service_account_env' | 'none';

let firebaseApp: admin.app.App | null = null;
let firebaseMockMode = false;
let firebaseMode: FirebaseMode = 'mock';
let firebaseCredentialSource: FirebaseCredentialSource = 'none';
let firebaseLastError: string | null = null;

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function initializeMockFirebase(reason?: string): admin.app.App {
  firebaseMockMode = true;
  firebaseMode = 'mock';
  firebaseCredentialSource = 'none';
  firebaseLastError = reason || null;

  console.warn('⚠️ Firebase running in mock mode.');
  if (reason) {
    console.warn(`⚠️ Reason: ${reason}`);
  }

  firebaseApp = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'sevasetu-dev',
  });

  return firebaseApp;
}

function canUseServiceAccountEnv(): boolean {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL);
}

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.GCS_BUCKET_NAME,
      });
      firebaseMockMode = false;
      firebaseMode = 'real';
      firebaseCredentialSource = 'google_application_credentials';
      firebaseLastError = null;
    } else if (canUseServiceAccountEnv()) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        storageBucket: process.env.GCS_BUCKET_NAME,
      });
      firebaseMockMode = false;
      firebaseMode = 'real';
      firebaseCredentialSource = 'service_account_env';
      firebaseLastError = null;
    } else {
      initializeMockFirebase('No Firebase Admin credentials found in environment.');
    }
  } catch (error) {
    const reason = `Firebase real initialization failed: ${stringifyError(error)}`;
    initializeMockFirebase(reason);
  }

  if (firebaseMode === 'real') {
    console.log(`✅ Firebase Admin initialized (${firebaseCredentialSource})`);
  }

  if (!firebaseApp) {
    return initializeMockFirebase('Firebase app initialization returned no app instance.');
  }

  return firebaseApp;
}

export async function verifyFirebaseRuntimeAvailability(): Promise<void> {
  if (!firebaseApp || firebaseMockMode) {
    return;
  }

  const credential = firebaseApp.options.credential;
  if (!credential || typeof credential.getAccessToken !== 'function') {
    return;
  }

  try {
    await credential.getAccessToken();
    firebaseLastError = null;
  } catch (error) {
    const reason = `Firebase runtime check failed: ${stringifyError(error)}`;

    try {
      await firebaseApp.delete();
    } catch {
      // Ignore cleanup errors before fallback
    }

    firebaseApp = null;
    initializeMockFirebase(reason);
  }
}

export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

export function getStorage(): admin.storage.Storage {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.storage();
}

export function isFirebaseMockMode(): boolean {
  return firebaseMockMode;
}

export function getFirebaseStatus() {
  return {
    mode: firebaseMode,
    isMock: firebaseMockMode,
    credentialSource: firebaseCredentialSource,
    projectId: firebaseApp?.options.projectId || process.env.FIREBASE_PROJECT_ID || null,
    lastError: firebaseLastError,
  };
}

export { admin };
