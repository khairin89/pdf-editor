#!/usr/bin/env node
/* global console */
/**
 * Writes public/licenses.txt: this app's own licence plus the licence of
 * every bundled third-party package (npm production deps and the Rust crates
 * compiled into the Android build). Shown in-app under "About & licences".
 *
 * Run with: pnpm notices
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LICENSE_FILE = /^(licen[cs]e|copying|notice)([-._].*)?(\.(md|txt))?$/i;
const RULE = '='.repeat(36);

function licenseTexts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => LICENSE_FILE.test(file))
    .sort()
    .map((file) => readFileSync(join(dir, file), 'utf-8').trim());
}

function section(name, version, license, extra, texts) {
  const head = [`${name} ${version}`, `License: ${license || 'see text'}`, ...extra].join('\n');
  const body =
    texts.length > 0
      ? texts.join('\n\n---\n\n')
      : '(No licence file shipped; see the SPDX identifier above.)';
  return `${RULE}\n${head}\n${RULE}\n\n${body}\n`;
}

const parts = [];

parts.push(
  'KertPDF — open-source notices',
  '',
  'KertPDF is based on "PDF Editor" by vensas GmbH',
  '(https://github.com/vensas/pdf-editor), used under the MIT License below.',
  '',
  section(
    'KertPDF / PDF Editor',
    '',
    'MIT',
    [],
    [readFileSync(join(root, 'LICENSE'), 'utf-8').trim()],
  ),
);

// npm production dependencies (bundled into the web app).
const npm = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], { cwd: root, encoding: 'utf-8' }),
);
const npmPackages = Object.values(npm)
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name));
parts.push(`\nJavaScript packages (${npmPackages.length})\n`);
for (const pkg of npmPackages) {
  const extra = [
    pkg.author && `Author: ${pkg.author}`,
    pkg.homepage && `Homepage: ${pkg.homepage}`,
  ].filter(Boolean);
  parts.push(
    section(pkg.name, pkg.versions.join(', '), pkg.license, extra, licenseTexts(pkg.paths[0])),
  );
}

// Rust crates compiled into the Android library.
const meta = JSON.parse(
  execFileSync(
    'cargo',
    ['metadata', '--format-version', '1', '--locked', '--filter-platform', 'aarch64-linux-android'],
    { cwd: join(root, 'src-tauri'), encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 },
  ),
);
const workspace = new Set(meta.workspace_members);
const crates = meta.packages
  .filter((crate) => !workspace.has(crate.id))
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
parts.push(`\nRust crates (${crates.length})\n`);
for (const crate of crates) {
  const extra = [
    crate.authors.length > 0 && `Authors: ${crate.authors.join(', ')}`,
    crate.repository && `Repository: ${crate.repository}`,
  ].filter(Boolean);
  parts.push(
    section(
      crate.name,
      crate.version,
      crate.license,
      extra,
      licenseTexts(dirname(crate.manifest_path)),
    ),
  );
}

const out = join(root, 'public', 'licenses.txt');
writeFileSync(out, parts.join('\n'));
console.log(`Wrote ${out} (${npmPackages.length} npm packages, ${crates.length} crates)`);
