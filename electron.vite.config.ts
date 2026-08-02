import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'speech-worker': resolve(__dirname, 'src/main/speech/speech-worker.ts'),
          'recognition-worker': resolve(__dirname, 'src/main/speech/recognition-worker.ts')
        },
        external: ['electron']
      },
      assetsDir: '.'
    }
  },
  preload: {
    plugins: [
      // externalizeDepsPlugin()
    ]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@src': resolve('src')
      }
    },
    plugins: [react(),tailwindcss(),],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          screenshotSelector: resolve(
            __dirname,
            'src/renderer/src/windows/screenshotSelector/index.html'
          ),
          resultOverlay: resolve(
            __dirname,
            'src/renderer/src/windows/resultOverlay/index.html'
          )
        }
      }
    }
  }
})
