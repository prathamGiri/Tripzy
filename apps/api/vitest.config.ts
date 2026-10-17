import { defineConfig } from 'vitest/config'

// Tests run against a throwaway SQLite database with the offline (mock) planner.
export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    env: { DATABASE_URL: 'file:./test.db', AI_PROVIDER: 'mock', DEMO_MODE: 'true' },
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
