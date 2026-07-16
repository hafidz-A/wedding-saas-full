import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // No-op so files that import 'server-only' for the runtime guard
      // can still be loaded by the node test environment.
      'server-only': fileURLToPath(new URL('./src/__test-stubs__/empty.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.js',
      'src/**/__tests__/**/*.test.tsx',
      'scripts/**/__tests__/**/*.test.mjs',
    ],
    globals: false,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
