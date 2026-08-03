#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────
// build.js — bundles the ES modules into one self-contained file.
//
//   node remake/build.js
//     → remake/standalone.html   (full document; works over file://)
//     → remake/standalone.frag.html (body-only fragment, no external font)
//
// The modules use a deliberately small subset of ES module syntax
// (named imports/exports only, no cycles, no default exports), so a
// regex bundler is enough and we avoid pulling in a build toolchain.
// ──────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// Dependency order — every module only imports ones listed above it.
const ORDER = [
  'core/math.js',
  'core/storage.js',
  'core/fx.js',
  'core/audio.js',
  'core/input.js',
  'data/pilots.js',
  'data/bestiary.js',
  'data/bosses.js',
  'data/progression.js',
  'game/entities.js',
  'game/game.js',
  'ui/ui.js',
  'main.js',
];

const IMPORT_NAMED = /^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const IMPORT_STAR = /^[ \t]*import\s*\*\s*as\s*(\w+)\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const EXPORT_DECL = /^([ \t]*)export\s+(const|let|var|function|class|async function)\s+/gm;
const EXPORT_LIST = /^[ \t]*export\s*\{([^}]*)\}\s*;?[ \t]*$/gm;

/** Resolve a relative specifier against the importing module's key. */
function resolveKey(fromKey, spec) {
  const abs = path.resolve(path.dirname(path.join(SRC, fromKey)), spec);
  const key = path.relative(SRC, abs).split(path.sep).join('/');
  if (!ORDER.includes(key)) throw new Error(`unknown import "${spec}" from ${fromKey} → ${key}`);
  if (ORDER.indexOf(key) >= ORDER.indexOf(fromKey)) {
    throw new Error(`out-of-order import: ${fromKey} needs ${key}, which is bundled later`);
  }
  return key;
}

function wrap(key) {
  let code = fs.readFileSync(path.join(SRC, key), 'utf8');
  const exported = new Set();

  code = code.replace(IMPORT_NAMED, (_m, names, spec) => {
    // `a, b as c` destructures cleanly once `as` becomes `:`
    const bindings = names.replace(/\bas\b/g, ':').replace(/\s+/g, ' ').trim();
    return `const { ${bindings} } = __M[${JSON.stringify(resolveKey(key, spec))}];`;
  });

  code = code.replace(IMPORT_STAR, (_m, alias, spec) =>
    `const ${alias} = __M[${JSON.stringify(resolveKey(key, spec))}];`);

  code = code.replace(EXPORT_LIST, (_m, names) => {
    for (const n of names.split(',')) {
      const name = n.split(/\bas\b/).pop().trim();
      if (name) exported.add(name);
    }
    return '';
  });

  code = code.replace(EXPORT_DECL, (_m, indent, kind, offset, whole) => {
    // capture the identifier that follows the declaration keyword
    const rest = whole.slice(offset + _m.length);
    const name = (rest.match(/^[A-Za-z_$][\w$]*/) || [])[0];
    if (name) exported.add(name);
    return `${indent}${kind} `;
  });

  if (code.includes('export ')) throw new Error(`${key}: unhandled export syntax`);
  if (/^\s*import\s/m.test(code)) throw new Error(`${key}: unhandled import syntax`);

  const names = [...exported].join(', ');
  return `// ── ${key} ${'─'.repeat(Math.max(2, 58 - key.length))}\n` +
    `__M[${JSON.stringify(key)}] = (() => {\n${code}\nreturn { ${names} };\n})();\n`;
}

function bundle() {
  return `const __M = {};\n\n` + ORDER.map(wrap).join('\n');
}

function build() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const js = bundle();
  const TAG = '<script type="module" src="./src/main.js"></script>';
  if (!html.includes(TAG)) throw new Error('module script tag not found in index.html');

  // Function replacer, not a string: `$$`, `$&` etc. in the bundled source
  // would otherwise be interpreted as replacement patterns and corrupted.
  const inlined = html.replace(TAG, () => `<script type="module">\n${js}\n</script>`);
  fs.writeFileSync(path.join(ROOT, 'standalone.html'), inlined);

  // Fragment for hosts that supply their own document shell and block
  // external requests (the font is progressive enhancement, so it goes).
  const frag = inlined
    .replace(/[\s\S]*?<body>/, '')
    .replace(/<\/body>[\s\S]*$/, '')
    .replace(/^[ \t]*<link[^>]*fonts\.(googleapis|gstatic)[^>]*>\s*$/gm, '');
  const head = inlined.slice(0, inlined.indexOf('</head>'));
  const style = head.slice(head.indexOf('<style>'), head.indexOf('</style>') + 8);
  const title = (head.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
  fs.writeFileSync(path.join(ROOT, 'standalone.frag.html'), `${title}\n${style}\n${frag}`);

  const kb = (f) => (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(0);
  console.log(`standalone.html      ${kb('standalone.html')} KB`);
  console.log(`standalone.frag.html ${kb('standalone.frag.html')} KB`);
}

build();
