import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_FRONTEND_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_FRONTEND_PORT) || 3000,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      // // Storage/Minio API
      // '/api/storage': {
      //   target: process.env.VITE_STORAGE_API_URL || 'http://backend-minio:8001',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api\/storage/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('error', (err, _req, _res) => {
      //       console.log('🔴 [Storage] Proxy error:', err.message);
      //     });
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log('📁 [Storage] Proxying:', req.method, req.url, '→', proxyReq.path);
      //     });
      //     proxy.on('proxyRes', (proxyRes, req, _res) => {
      //       console.log('📁 [Storage] Response:', proxyRes.statusCode, req.url);
      //     });
      //   },
      // },

      // // Tasks API
      // '/api/tasks': {
      //   target: process.env.VITE_TASKS_API_URL || 'http://backend-tasks:8002',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api\/tasks/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('error', (err, _req, _res) => {
      //       console.log('🔴 [Tasks] Proxy error:', err.message);
      //     });
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log('⚙️ [Tasks] Proxying:', req.method, req.url, '→', proxyReq.path);
      //     });
      //     proxy.on('proxyRes', (proxyRes, req, _res) => {
      //       console.log('⚙️ [Tasks] Response:', proxyRes.statusCode, req.url);
      //     });
      //   },
      // },

      // // Queue API
      // '/api/queue': {
      //   target: process.env.VITE_QUEUE_API_URL || 'http://backend-queue:8003',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api\/queue/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('error', (err, _req, _res) => {
      //       console.log('🔴 [Queue] Proxy error:', err.message);
      //     });
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log('🔄 [Queue] Proxying:', req.method, req.url, '→', proxyReq.path);
      //     });
      //     proxy.on('proxyRes', (proxyRes, req, _res) => {
      //       console.log('🔄 [Queue] Response:', proxyRes.statusCode, req.url);
      //     });
      //   },
      // },

      // // Notifications API (ejemplo adicional)
      // '/api/notifications': {
      //   target: process.env.VITE_NOTIFICATIONS_API_URL || 'http://backend-notifications:8004',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api\/notifications/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('error', (err, _req, _res) => {
      //       console.log('🔴 [Notifications] Proxy error:', err.message);
      //     });
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log('🔔 [Notifications] Proxying:', req.method, req.url, '→', proxyReq.path);
      //     });
      //     proxy.on('proxyRes', (proxyRes, req, _res) => {
      //       console.log('🔔 [Notifications] Response:', proxyRes.statusCode, req.url);
      //     });
      //   },
      // },

      // FALLBACK - Main API (debe ir AL FINAL)
      '/api': {
        target: process.env.VITE_FRONTEND_API_URL || 'http://backend-api:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔴 [Main API] Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔗 [Main API] Proxying:', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('🔗 [Main API] Response:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@helpers': path.resolve(__dirname, './src/helpers'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          services: ['axios'],
        },
      },
    },
  },
});