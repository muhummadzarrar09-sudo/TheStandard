import { defineConfig } from 'vitest/config'

// Vitest config. The audit doc called for unit tests for timezone,
// scoring, streaks, and idempotency. We have those in tests/. This file
// just locks the include path and ensures the test environment is right.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Vitest pools default to 'threads'; keep it explicit so future
    // changes to system settings don't accidentally serialize.
    pool: 'threads',
    testTimeout: 10000
  }
})
