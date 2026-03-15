import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  assetsInclude: ['**/*.glb', '**/*.ktx2'],
})
