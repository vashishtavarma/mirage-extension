/**
 * Packages the extension for Chrome Web Store submission.
 * Produces artifacts/chrome/privacy-mesh-{version}.zip
 * Uses the `archiver` npm package — fully cross-platform, no shell spawning.
 */
import archiver from 'archiver';
import { createWriteStream, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;
const outDir = 'artifacts/chrome';
const outFile = join(outDir, `privacy-mesh-${version}.zip`);

// Only these top-level entries go into the Chrome package
const INCLUDE = [
  { type: 'directory', src: 'dist',  dest: 'dist'  },
  { type: 'directory', src: 'icons', dest: 'icons' },
  { type: 'file',      src: 'manifest.json' },
  { type: 'file',      src: 'LICENSE' },
  { type: 'file',      src: 'README.md' },
];

mkdirSync(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`\n✓ Chrome package: ${outFile} (${kb} KB)`);
  console.log('  Upload at: https://chrome.google.com/webstore/devconsole');
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);

for (const entry of INCLUDE) {
  if (entry.type === 'directory') {
    archive.directory(entry.src, entry.dest);
  } else {
    archive.file(entry.src, { name: entry.src });
  }
}

await archive.finalize();
