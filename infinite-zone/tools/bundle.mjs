// Zero-dependency bundler for this repo's own module style: single-line
// named imports, and `export` only on declarations. Produces
//   dist/index.html     one self-contained file that runs offline
//   dist/artifact.html  the same page as a fragment for hosted embeds
//   node tools/bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$/;
const EXPORT = /^export\s+(?:async\s+)?(?:function\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/;

const order = [];
const ids = new Map();

function load(file) {
  if (ids.has(file)) return ids.get(file);
  ids.set(file, -1); // cycle guard
  const src = readFileSync(file, 'utf8');
  const exportsList = [];
  const body = src.split('\n').map((line) => {
    const im = line.match(IMPORT);
    if (im) {
      const dep = load(resolve(dirname(file), im[2]));
      if (dep < 0) throw new Error(`Import cycle at ${relative(root, file)}`);
      const names = im[1].split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ': '));
      return `const { ${names.join(', ')} } = __m[${dep}];`;
    }
    if (/^\s*import\s/.test(line) || /^export\s*\{/.test(line) || /^export\s+default/.test(line)) {
      throw new Error(`Unsupported module syntax in ${relative(root, file)}: ${line}`);
    }
    const ex = line.match(EXPORT);
    if (ex) {
      exportsList.push(ex[1]);
      return line.replace(/^export\s+/, '');
    }
    return line;
  }).join('\n');
  const id = order.length;
  order.push(`// ${relative(root, file)}\n__m[${id}] = (() => {\n${body}\nreturn { ${exportsList.join(', ')} };\n})();`);
  ids.set(file, id);
  return id;
}

load(resolve(root, 'src/shell/main.js'));
const js = `(() => {\n'use strict';\nconst __m = [];\n${order.join('\n\n')}\n})();`;
if (js.includes('</script')) throw new Error('Bundle contains a closing script tag');

const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const tag = '<script type="module" src="src/shell/main.js"></script>';
if (!html.includes(tag)) throw new Error('Entry script tag not found in index.html');
const full = html.replace(tag, `<script>\n${js}\n</script>`);

const pick = (re) => (html.match(re) || [])[0] || '';
const head = [
  pick(/<title>[\s\S]*?<\/title>/),
  ...html.match(/<link[^>]+>/g) ?? [],
  pick(/<style>[\s\S]*?<\/style>/),
].join('\n');
const bodyInner = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(tag, `<script>\n${js}\n</script>`);
const fragment = `${head}\n${bodyInner.trim()}\n`;

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/index.html'), full);
writeFileSync(resolve(root, 'dist/artifact.html'), fragment);
console.log(`bundled ${order.length} modules, ${(js.length / 1024).toFixed(1)} KB -> dist/index.html, dist/artifact.html`);
