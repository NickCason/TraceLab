// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['test/**/*.test.js', 'test/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/utils/fonts.js', 'src/utils/download.js'],
    },
  },
});
