// Concat build: stitches src/index.template.html + the ordered src/js/*.js
// parts back into the single shipped index.html. No bundler, no deps — the
// parts are plain fragments of one shared IIFE scope, joined in filename order.
//
//   node build.mjs           rebuild index.html
//   node build.mjs --check    fail (exit 1) if index.html is stale
//
// Develop in src/, run the build, commit the regenerated index.html alongside.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const jsDir = join(root, 'src', 'js');
const outPath = join(root, 'index.html');
const MARKER = '// @@BUNDLE@@\n';

const parts = readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
if (!parts.length) {
  console.error('build: no src/js/*.js parts found');
  process.exit(1);
}
const bundle = parts.map((f) => readFileSync(join(jsDir, f), 'utf8')).join('');

const tpl = readFileSync(join(root, 'src', 'index.template.html'), 'utf8');
if (!tpl.includes(MARKER)) {
  console.error('build: bundle marker not found in src/index.template.html');
  process.exit(1);
}
const out = tpl.replace(MARKER, bundle);

// syntax-check the stitched script before writing
try {
  const m = out.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
  // eslint-disable-next-line no-new-func
  new Function(m ? m[1] : bundle);
} catch (e) {
  console.error('build: stitched script has a syntax error:\n' + e.message);
  process.exit(1);
}

const check = process.argv.includes('--check');
let current = '';
try { current = readFileSync(outPath, 'utf8'); } catch { /* first build */ }

if (check) {
  if (current !== out) {
    console.error('build --check: index.html is stale — run `node build.mjs`');
    process.exit(1);
  }
  console.log('build --check: index.html is up to date');
} else {
  writeFileSync(outPath, out);
  console.log(`build: index.html <- ${parts.length} parts (${out.length} bytes)` +
    (current === out ? ' (no change)' : ''));
}
