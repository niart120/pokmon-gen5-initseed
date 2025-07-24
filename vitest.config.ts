import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  test: {
    globals: true,
    environment: 'node', // Node.js環境でWebAssemblyをテスト
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000, // WebAssembly読み込みのため長めに設定
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
