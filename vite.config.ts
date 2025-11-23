import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig(({ mode }) => {
        const env = loadEnv(mode, '.', '');
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
        return {
                base: '/ST_debugger/',
                server: {
                        port: 5000,
                        host: '0.0.0.0',
                },
                plugins: [react()],
                define: {
                        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
                        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
                        'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
                },
                resolve: {
                        alias: {
                                '@': path.resolve(__dirname, '.'),
                        }
                },
                json: {
                        stringify: false,
                },
        };
});