import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    strictPort: true, // Fail if port is already in use
    // Ensure proper CORS handling for network access
    cors: true,
    // Allow access from any origin during development
    hmr: {
      host: process.env.HOST || process.env.VITE_WS_HOST || 'localhost'
    }
  },
  // Ensure environment variables are properly exposed
  define: {
    // Make sure env vars are available at build time
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Ensure proper asset handling for network access
  base: './',
  build: {
    // Ensure relative paths work from any host
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});