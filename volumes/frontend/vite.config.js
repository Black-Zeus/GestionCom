import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite acceder desde cualquier dirección
    port: 3000,      // Usa el puerto 3000
    strictPort: true, // Lanza error si el puerto ya está en uso
    watch: {
      usePolling: true, // Soluciona problemas con sistemas de archivos montados en Docker
      interval: 100,    // Intervalo de tiempo para verificar cambios
    },
  },
});
