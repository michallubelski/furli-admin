/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim();

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      globals: true,
    },
    server: {
      host: '0.0.0.0',
      port: 5175,
      // Fail fast if 5175 is taken instead of silently moving to the next free port - a silently
      // shifted dev port still serves the app, but its Origin header stops matching the backend's
      // CORS allowlist, producing a confusing 403 far from the actual cause.
      strictPort: true,
      ...(apiProxyTarget ? {
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
          },
        },
      } : {}),
    },
  };
});
