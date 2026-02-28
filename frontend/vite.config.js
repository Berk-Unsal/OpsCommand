import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Required for Docker container networking
    allowedHosts: ['opscommand.local'] // This tells Vite to accept our Ingress traffic
  }
})