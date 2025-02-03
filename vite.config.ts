import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

const outputConfig = {
	entryFileNames: 'index.min.js',
	chunkFileNames: 'index-[hash].js',
	assetFileNames: 'index.min.[ext]',
}
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// https://vitejs.dev/config/
const config = ({ mode }) => {
	const env = loadEnv(mode, process.cwd())
	const outputs = [env.VITE_OUTPUT_DIR]

	return defineConfig({
		plugins: [basicSsl(), react()],
		build: {
			rollupOptions: {
				external: ['moment-timezone'],
				input: {
					main: env.VITE_ENTRYPOINT,
				},
				output: outputs.map(output => ({
					...outputConfig,
					dir: './' + output,
				})),
			},
			outDir: './dist',
			sourcemap: true,
			emptyOutDir: true,
		},
		server: {
			host: env.VITE_HOST,
			https: {
				key: env.VITE_HTTPS_KEY,
				cert: env.VITE_HTTPS_CERT,
			},
			port: Number(env.VITE_PORT),
			hmr: {
				host: 'localhost',
			},
		},
		resolve: {
			alias: [
				{ find: '@s', replacement: path.resolve(__dirname, 'src/@styles') },
				{ find: '@t', replacement: path.resolve(__dirname, 'src/@types') },
				{ find: '@a', replacement: path.resolve(__dirname, 'src/@assets') },
			],
		},
	})
}

export default config
