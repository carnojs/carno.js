import { copyFileSync } from 'fs'

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  target: "node",
  format: 'cjs',
  sourcemap: 'external',
})

//copyFileSync('dist/index.d.ts', 'dist/bun/index.d.ts')

export {}