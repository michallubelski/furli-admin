var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, '.', '');
    var apiProxyTarget = (_b = env.VITE_API_PROXY_TARGET) === null || _b === void 0 ? void 0 : _b.trim();
    return {
        plugins: [react()],
        test: {
            environment: 'jsdom',
            setupFiles: ['./test/setup.ts'],
            globals: true,
        },
        server: __assign({ host: '0.0.0.0', port: 5175, 
            // Fail fast if 5175 is taken instead of silently moving to the next free port - a silently
            // shifted dev port still serves the app, but its Origin header stops matching the backend's
            // CORS allowlist, producing a confusing 403 far from the actual cause.
            strictPort: true }, (apiProxyTarget ? {
            proxy: {
                '/api': {
                    target: apiProxyTarget,
                    changeOrigin: true,
                },
            },
        } : {})),
    };
});
