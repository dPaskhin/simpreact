import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcMainDir = path.resolve(root, 'src/main');
const libDir = path.resolve(root, 'lib');

const copies = [
  ['core/public.d.ts', 'core/index.d.ts'],
  ['core/internal-public.d.ts', 'core/internal.d.ts'],
  ['shared/public.d.ts', 'shared/index.d.ts'],
  ['hooks/public.d.ts', 'hooks/index.d.ts'],
  ['jsx-runtime/public.d.ts', 'jsx-runtime/index.d.ts'],
  ['context/public.d.ts', 'context/index.d.ts'],
  ['component/public.d.ts', 'component/index.d.ts'],
  ['dom/public.d.ts', 'dom/index.d.ts'],
  ['compat/public.d.ts', 'compat/index.d.ts'],
];

for (const [src, dest] of copies) {
  const srcPath = path.join(srcMainDir, src);
  const destPath = path.join(libDir, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}
