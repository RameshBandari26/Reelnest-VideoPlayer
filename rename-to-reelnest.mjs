import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'release', '.git', '.expo', 'android', 'ios']);
const SKIP_FILES = new Set(['package-lock.json', 'rename-to-reelnest.mjs', 'RELEASE-GUIDE.md']);
const EXTS = new Set(['.js', '.jsx', '.cjs', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml', '.toml', '.svg']);
const RULES = [
  [/app\.lumo\.player/g, 'app.reelnest.player'],
  [/Lumo(?!2)/g, 'Reelnest'],
];

if (!fs.existsSync('apps') || !fs.existsSync('packages')) {
  console.error('Run this from the project root (the folder that contains "apps" and "packages").');
  process.exit(1);
}

let changedFiles = 0;
let changedLines = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(full); continue; }
    if (SKIP_FILES.has(e.name) || !EXTS.has(path.extname(e.name))) continue;
    const before = fs.readFileSync(full, 'utf8');
    let after = before;
    for (const [re, to] of RULES) after = after.replace(re, to);
    if (after === before) continue;
    const n = before.split('\n').filter((l, i) => l !== after.split('\n')[i]).length;
    changedFiles += 1; changedLines += n;
    console.log(`${DRY ? 'would change' : 'changed'}: ${full}  (${n} line${n === 1 ? '' : 's'})`);
    if (!DRY) fs.writeFileSync(full, after);
  }
}
walk('.');
console.log(`\n${DRY ? 'Dry run: ' : ''}${changedFiles} file(s), ${changedLines} line(s)${DRY ? ' would be' : ''} updated.`);