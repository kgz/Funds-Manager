import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const portEnv = env.VITE_PORT
  const port = portEnv ? Number(portEnv) : 3000

  const httpsKeyPath = env.VITE_HTTPS_KEY_PATH
  const httpsCertPath = env.VITE_HTTPS_CERT_PATH

  return {
    plugins: [
      react(),
      tailwindcss(),
      mkcert(),
    ],
    server: {
      port,
      https: httpsKeyPath && httpsCertPath
        ? {
            key: fs.readFileSync(httpsKeyPath),
            cert: fs.readFileSync(httpsCertPath),
          }
        : undefined,
    },
    resolve: {
      alias: {
        '@/assets': '/src/assets',
        '@/components': '/src/components',
        '@/lib': '/src/lib',
        '@/styles': '/src/components/ui-styles',
        '@': '/src',
      },
    },
  }
})
