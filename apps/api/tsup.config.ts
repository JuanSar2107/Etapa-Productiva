import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  // @ep/shared se publica como TypeScript sin compilar: hay que incluirlo en el bundle.
  noExternal: ['@ep/shared'],
});
