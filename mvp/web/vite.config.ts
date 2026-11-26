import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A interface é servida pelo nginx do container `web`, que faz proxy de /api/* para os
// serviços. No desenvolvimento local (`npm run dev`) este proxy replica esse roteamento.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/identity': 'http://localhost:3001',
      '/api/customers': 'http://localhost:3002',
      '/api/orders': 'http://localhost:3003',
    },
  },
  build: { outDir: 'dist' },
});
