import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Proxy all /api requests to the Express backend during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
