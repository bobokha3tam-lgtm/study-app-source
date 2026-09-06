import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const zip = new AdmZip();
const rootDir = process.cwd();

const ignoreDirs = ['node_modules', '.git', 'dist', '.vite'];
const ignoreFiles = ['public/project-source.zip', 'public/project-source.tar.gz'];

function addFilesRecursively(dir, zipPath = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(rootDir, fullPath);

    if (ignoreDirs.some(i => relPath === i || relPath.startsWith(i + '/'))) continue;
    if (ignoreFiles.includes(relPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addFilesRecursively(fullPath, path.join(zipPath, file));
    } else {
      zip.addLocalFile(fullPath, zipPath);
    }
  }
}

addFilesRecursively(rootDir);

const publicDir = path.join(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'project-source.zip');
zip.writeZip(outputPath);
console.log(`ZIP successfully created at ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
