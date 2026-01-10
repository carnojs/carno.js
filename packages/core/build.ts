import { $ } from 'bun'
import { build, type Options } from 'tsup'
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin'

import pack from './package.json'

const bundledDeps = ['reflect-metadata', 'zod']

const external = [
    ...Object.keys(pack.dependencies ?? {}),
    ...Object.keys(pack.peerDependencies ?? {})
].filter(dep => !bundledDeps.includes(dep))

await $`rm -rf dist`

await build({
    entry: ['src/**/*.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    target: 'node20',
    minifySyntax: true,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    splitting: false,
    sourcemap: false,
    cjsInterop: false,
    clean: true,
    bundle: false,
    external,
    esbuildPlugins: [fixImportsPlugin()]
})

await $`tsc --project tsconfig.json`

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist/bun',
    minify: {
        whitespace: true,
        syntax: true,
        identifiers: false
    },
    target: 'bun',
    sourcemap: 'linked',
    external
})

process.exit()
