import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Required for Docker container networking
    // Keep ingress host support while also allowing direct local access.
    allowedHosts: ['opscommand.local', 'localhost', '127.0.0.1', '.localhost']
  }
})