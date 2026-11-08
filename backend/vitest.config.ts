import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests run against dynamodb-local using a dedicated table
    env: { TABLE_NAME: 'JobHuntingTable_test' },
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
  },
});
