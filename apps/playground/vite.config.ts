import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@flash/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@flash/model': path.resolve(__dirname, '../../packages/model/src/index.ts'),
      '@flash/transform': path.resolve(__dirname, '../../packages/transform/src/index.ts'),
      '@flash/state': path.resolve(__dirname, '../../packages/state/src/index.ts'),
      '@flash/view': path.resolve(__dirname, '../../packages/view/src/index.ts'),
      '@flash/commands': path.resolve(__dirname, '../../packages/commands/src/index.ts'),
      '@flash/i18n': path.resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@flash/starter-kit': path.resolve(__dirname, '../../packages/starter-kit/src/index.ts'),
      '@flash/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@flash/theme-default': path.resolve(__dirname, '../../packages/theme-default/src/index.ts'),
      '@flash/theme-notion': path.resolve(__dirname, '../../packages/theme-notion/src/index.ts'),
      '@flash/theme-docs': path.resolve(__dirname, '../../packages/theme-docs/src/index.ts'),
      '@flash/templates': path.resolve(__dirname, '../../packages/templates/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
