/**
 * Packages the extension for Chrome Web Store submission.
 * Produces artifacts/chrome/privacy-mesh-{version}.zip
 *
 * Excludes: node_modules, src, tests, docs, scripts, .github, .git
 */
import { createWriteStream, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;
const outDir = 'artifacts/chrome';
const outFile = join(outDir, `privacy-mesh-${version}.zip`);

const EXCLUDE = new Set([
  'node_modules', 'src', 'tests', 'docs', 'scripts', '.github',
  '.git', 'artifacts', '.claude', 'coverage',
  'babel.config.cjs', 'webpack.config.js', 'eslint.config.js',
  '.prettierrc', '.gitignore', 'package-lock.json', 'PLAN.md',
  'CONTRIBUTING.md', 'CHANGELOG.md',
]);

mkdirSync(outDir, { recursive: true });

// Use PowerShell's Compress-Archive on Windows, zip on Unix
const isWin = process.platform === 'win32';

if (isWin) {
  // Build file list (exclude unwanted dirs)
  const items = readdirSync('.').filter((f) => !EXCLUDE.has(f));
  const include = items.join('","');
  execSync(
    `powershell -Command "Compress-Archive -Path \\"${include}\\" -DestinationPath \\"${outFile}\\" -Force"`,
    { stdio: 'inherit' }
  );
} else {
  const excludeArgs = [...EXCLUDE].map((e) => `--exclude='${e}/*'`).join(' ');
  execSync(`zip -r "${outFile}" . ${excludeArgs} --exclude='*.git*'`, { stdio: 'inherit' });
}

console.log(`\nChrome package: ${outFile}`);
console.log('Ready for Chrome Web Store upload at https://chrome.google.com/webstore/devconsole');
