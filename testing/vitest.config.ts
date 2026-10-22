import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['api/**/*.test.ts'],
    globalSetup: ['shared/preflight.ts'],
    testTimeout: 15_000,
  },
})
