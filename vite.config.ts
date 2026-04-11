import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProductionBuild = mode === 'production';

  if (isProductionBuild) {
    const requiredVars = [
      'VITE_API_BASE_URL',
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_GOOGLE_MAPS_API_KEY',
    ];

    const missingVars = requiredVars.filter((name) => !env[name]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required production frontend env vars: ${missingVars.join(', ')}`);
    }

    if ((env.VITE_DEV_AUTH_BYPASS || '').trim().toLowerCase() === 'true') {
      throw new Error('VITE_DEV_AUTH_BYPASS cannot be true for production builds.');
    }
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
