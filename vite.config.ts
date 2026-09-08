import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = env.VITE_APP_VERSION || '0.1.0';
  const apiCompatibility = env.VITE_API_COMPATIBILITY_VERSION || '3';

  return {
    plugins: [react(), tailwindcss(), {
      name: 'linawletra-deployment-marker',
      transformIndexHtml(html) {
        return html
          .replace('__LINAWLETRA_APP_VERSION__', appVersion)
          .replace('__LINAWLETRA_API_COMPATIBILITY__', apiCompatibility);
      },
    }],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
