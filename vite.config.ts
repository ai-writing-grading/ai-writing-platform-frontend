import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_GATEWAY_URL ?? "http://localhost:8000";

  return {
    plugins: [
      react(),
      TanStackRouterVite(),
    ],
    server: {
      proxy: {
        '/auth': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        }
      }
    }
  };
});
