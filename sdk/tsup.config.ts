import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['react', 'react/jsx-runtime', 'zod'],
    banner: { js: '"use client";' },
  },
  {
    entry: { core: 'src/core.ts' },
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    outDir: 'dist',
    external: ['react', 'react/jsx-runtime', 'zod'],
  },
]);
