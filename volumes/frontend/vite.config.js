import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const sharedCommonDir = process.env.VITE_SHARED_COMMON_DIR || path.resolve(__dirname, '../../Shared/common');

export default defineConfig({
  plugins: [react()],

  server: {
    host: process.env.VITE_FRONTEND_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_FRONTEND_PORT || '3000', 10),
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 250,
    },
    hmr: {
      protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
      host: process.env.VITE_HMR_HOST || 'localhost',
      clientPort: parseInt(process.env.VITE_HMR_CLIENT_PORT || '80', 10),
    },
    proxy: {
      '/api': {
        target: process.env.VITE_FRONTEND_API_URL || 'http://backend-api:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (urlPath) => urlPath.replace(/^\/api/, ''),
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@shared': sharedCommonDir,
    },
  },

  css: {
    postcss: './postcss.config.js',
  },

  build: {
    sourcemap: true,
    target: 'es2020',
    cssTarget: 'chrome80',
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType)) {
            return 'images/[name]-[hash][extname]';
          }
          if (/css/i.test(extType)) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'react-icons/fa6'],
  },

  cacheDir: 'node_modules/.vite',
  base: process.env.VITE_BASE_URL || '/',
});
