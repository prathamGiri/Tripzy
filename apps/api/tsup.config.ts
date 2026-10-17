import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  // The shared package ships TypeScript source, so bundle it into the server build.
  noExternal: ['@tripzy/shared'],
})
