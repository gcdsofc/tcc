import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api/identity':'http://localhost:3001','/api/customers':'http://localhost:3002','/api/orders':'http://localhost:3003'}},build:{outDir:'dist'}});
