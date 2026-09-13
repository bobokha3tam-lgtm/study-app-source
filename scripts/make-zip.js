import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const zip = new AdmZip();
const rootDir = process.cwd();

const ignoreDirs = ['node_modules', '.git', 'dist', '.vite'];
const ignoreFiles = ['public/project-source.zip', 'public/project-source.tar.gz'];

// Secrets and private runtime data must NEVER be bundled into the downloadable
// source zip. Previously this script had no exclusion list for these at all,
// so the live API key(s) and every student's real name/password/passwordHash
// would end up inside a file anyone with the (weak, brute-forceable) counselor
// passcode could download from a running server.
const ignorePatterns = [
  /^\.env(\..*)?$/i,                 // .env, .env.local, etc — real secrets
  /^data_students_registry\.json$/i, // live student PII + password hashes
  /service-account.*\.json$/i,       // Firebase/GCP admin credentials
  /^firebase-service-account\.json$/i,
  /\.pem$/i,
  /\.key$/i,
];

function isIgnoredFile(relPath) {
  const baseName = path.basename(relPath);
  return ignorePatterns.some((pattern) => pattern.test(baseName));
}

function addFilesRecursively(dir, zipPath = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(rootDir, fullPath);

    if (ignoreDirs.some(i => relPath === i || relPath.startsWith(i + '/'))) continue;
    if (ignoreFiles.includes(relPath)) continue;
    if (isIgnoredFile(relPath)) continue;

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
