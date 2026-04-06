import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
        login: path.resolve(__dirname, 'public/login.html'),
        dashboard: path.resolve(__dirname, 'public/dashboard.html')
      },
      output: {
        assetFileNames: (assetInfo) => {
          // Keep manifest, icons, and logos at root, not in assets
          const name = assetInfo.name;
          if (name === 'manifest.json' || name.includes('icon-') || name === 'logo.svg' || name === 'sw.js') {
            return name;
          }
          // Put everything else in assets
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    middlewareMode: false
  },
  plugins: [
    {
      name: 'copy-pwa-files',
      generateBundle() {
        // Copy service worker
        const swPath = path.resolve(__dirname, 'public/sw.js')
        const swContent = fs.readFileSync(swPath, 'utf-8')
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swContent
        })
        
        // Copy manifest.json to root (not in assets)
        const manifestPath = path.resolve(__dirname, 'public/manifest.json')
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: manifestContent
        })
        
        // Copy icon files
        const icon192 = path.resolve(__dirname, 'public/icon-192.svg')
        const icon512 = path.resolve(__dirname, 'public/icon-512.svg')
        
        if (fs.existsSync(icon192)) {
          const iconContent = fs.readFileSync(icon192, 'utf-8')
          this.emitFile({
            type: 'asset',
            fileName: 'icon-192.svg',
            source: iconContent
          })
        }
        
        if (fs.existsSync(icon512)) {
          const iconContent = fs.readFileSync(icon512, 'utf-8')
          this.emitFile({
            type: 'asset',
            fileName: 'icon-512.svg',
            source: iconContent
          })
        }

        // Copy logo.svg
        const logoPath = path.resolve(__dirname, 'public/logo.svg')
        if (fs.existsSync(logoPath)) {
          const logoContent = fs.readFileSync(logoPath, 'utf-8')
          this.emitFile({
            type: 'asset',
            fileName: 'logo.svg',
            source: logoContent
          })
        }
      }
    }
  ]
})
