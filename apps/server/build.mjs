// Bundles the server into dist/. Workspace packages (written in TypeScript) are inlined;
// third-party dependencies stay external and are loaded from node_modules at runtime.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const { version, dependencies } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);
const external = Object.keys(dependencies).filter((name) => !name.startsWith('@vidly/'));

await build({
  entryPoints: { index: 'src/index.ts', seed: 'src/scripts/seed.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external,
  define: { 'process.env.npm_package_version': JSON.stringify(version) },
  logLevel: 'info',
});
