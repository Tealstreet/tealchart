import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'worker/worker': 'src/worker/worker.ts',
  },
  format: ['cjs', 'esm'],
  dts: { compilerOptions: { incremental: false } },
  clean: true,
  sourcemap: true,
});
