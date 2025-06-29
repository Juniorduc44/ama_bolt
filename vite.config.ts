import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This enables access via local IP address
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});