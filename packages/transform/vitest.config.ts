import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@flash/model': path.resolve(__dirname, '../model/src/index.ts'),
    },
  },
});
