import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const isCodespaces = process.env.CODESPACES === 'true';
const codespaceUrl = isCodespaces
    ? `https://${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5174,
        origin: codespaceUrl?.replace('-5173.', '-5174.'),
        cors: true,
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
        ...(codespaceUrl ? {
            allowedHosts: [process.env.CODESPACE_NAME + '-5173.' + process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN],
        } : {}),
    },
});
