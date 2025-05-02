import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
	react(),
    tailwindcss(),
	mkcert()
  ],
  server:{
	port: 3000,
	https: {
		key: fs.readFileSync('/mnt/dev/localhost-key.pem'),
		cert: fs.readFileSync('/mnt/dev/localhost.pem'),
	}
  },

//   "paths": {
// 		"@/*": ["src/*"],
// 		"@assets/*": ["src/assets/*"],
// 		"@components/*": ["src/components/*"],
// 		"@lib/*": ["src/lib/*"],
// 	}

  resolve: {
	alias: {
	  '@/assets': '/src/assets',
	  '@/components': '/src/components',
	  '@/lib': '/src/lib',
	  '@/styles': '/src/components/ui-styles',
	  '@': '/src',

	},
  },
})
