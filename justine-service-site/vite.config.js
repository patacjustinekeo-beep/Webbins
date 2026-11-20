import { defineConfig } from 'vite';

// host: true lets GitHub Codespaces forward the port to your browser
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
});
