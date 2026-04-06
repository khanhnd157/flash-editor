import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'happy-dom',
  },
  resolve: {
    alias: {
      '@flash/model': path.resolve(__dirname, '../model/src/index.ts'),
      '@flash/transform': path.resolve(__dirname, '../transform/src/index.ts'),
      '@flash/state': path.resolve(__dirname, '../state/src/index.ts'),
      '@flash/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@flash/view': path.resolve(__dirname, '../view/src/index.ts'),
      '@flash/svelte': path.resolve(__dirname, './src/index.ts'),
    },
  },
});
