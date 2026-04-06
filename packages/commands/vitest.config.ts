import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@flash/model': path.resolve(__dirname, '../model/src/index.ts'),
      '@flash/transform': path.resolve(__dirname, '../transform/src/index.ts'),
      '@flash/state': path.resolve(__dirname, '../state/src/index.ts'),
    },
  },
});
