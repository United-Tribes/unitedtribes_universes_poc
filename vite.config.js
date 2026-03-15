import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: "/jd-universes-poc/",
  server: {
    port: 5174,
    proxy: {
      '/api/yta': {
        target: 'http://localhost:3002',
        rewrite: (path) => path.replace(/^\/api\/yta/, '/api'),
        changeOrigin: true,
      },
    },
  },
}));
