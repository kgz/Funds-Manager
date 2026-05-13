import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'
import https from 'node:https'

const apiProxyHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const prodBaseRaw = env.VITE_BASE?.trim()
  const base =
    mode === 'production' && prodBaseRaw !== undefined && prodBaseRaw.length > 0
      ? prodBaseRaw.endsWith('/')
        ? prodBaseRaw
        : `${prodBaseRaw}/`
      : '/'

  const portEnv = env.VITE_PORT
  const port = portEnv ? Number(portEnv) : 3000

  const httpsKeyPath = env.VITE_HTTPS_KEY_PATH
  const httpsCertPath = env.VITE_HTTPS_CERT_PATH
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? 'https://127.0.0.1:2020'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      ...(mode !== 'production' ? [mkcert()] : []),
    ],
    build:
      mode === 'production'
        ? {
            outDir: '../app/static',
            emptyOutDir: true,
            assetsDir: '',
            rollupOptions: {
              output: {
                entryFileNames: 'index.min.js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: (info) => {
                  const name = info.names[0]
                  if (name?.endsWith('.css')) {
                    return 'index.min.css'
                  }
                  return 'assets/[name]-[hash][extname]'
                },
              },
            },
          }
        : undefined,
    server: {
      port,
      https: httpsKeyPath && httpsCertPath
        ? {
            key: fs.readFileSync(httpsKeyPath),
            cert: fs.readFileSync(httpsCertPath),
          }
        : undefined,
      cors: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          agent: apiProxyHttpsAgent,
          timeout: 60_000,
          proxyTimeout: 60_000,
        },
      },
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
