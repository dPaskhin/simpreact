import fs from 'fs';
import path from 'node:path';

const root = process.cwd();
const srcMainDir = path.resolve(root, 'src/main');
const libDir = path.resolve(root, 'lib');

for (const file of fs.readdirSync(srcMainDir, { recursive: true })) {
  if (file.endsWith('public.d.ts')) {
    const srcPath = path.join(srcMainDir, file);
    const destPath = path.join(libDir, path.dirname(file), 'index.d.ts');
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}
