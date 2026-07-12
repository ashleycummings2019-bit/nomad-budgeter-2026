#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════╗
 * ║   FRONT MATTER VALIDATOR — Build Safety Net      ║
 * ║   Catches broken YAML before Eleventy explodes   ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Scans all .md and .njk files in src/ for YAML front matter
 * and validates it can be parsed without errors.
 * Auto-fixes common issues (unquoted colons in titles).
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src');

// Simple YAML front matter extractor
function extractFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

// Check if a YAML value needs quoting (contains colons after the key)
function needsQuoting(line) {
  // Match lines like `title: Some Text: More Text` where the value has an unquoted colon
  const keyValueMatch = line.match(/^(\s*\w+):\s*(.+)$/);
  if (!keyValueMatch) return false;
  
  const value = keyValueMatch[2];
  // Already quoted
  if (/^["'].*["']$/.test(value)) return false;
  // Value contains a colon (the problematic case)
  if (value.includes(':')) return true;
  return false;
}

// Auto-fix: wrap value in double quotes
function fixLine(line) {
  const keyValueMatch = line.match(/^(\s*\w+):\s*(.+)$/);
  if (!keyValueMatch) return line;
  const key = keyValueMatch[1];
  const value = keyValueMatch[2];
  // Escape any existing double quotes in the value
  const escaped = value.replace(/"/g, '\\"');
  return `${key}: "${escaped}"`;
}

// Walk directory recursively
function walkDir(dir, exts) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip _site, node_modules, .git, drafts
      if (['_site', 'node_modules', '.git', 'drafts'].includes(entry.name)) continue;
      results.push(...walkDir(fullPath, exts));
    } else if (exts.includes(extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Main
let errors = 0;
let fixed = 0;
const files = walkDir(SRC_DIR, ['.md', '.njk']);

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  const fm = extractFrontMatter(content);
  if (!fm) continue;

  const lines = fm.split('\n');
  let needsFix = false;
  const fixedLines = [];

  for (const line of lines) {
    if (needsQuoting(line)) {
      needsFix = true;
      fixedLines.push(fixLine(line));
    } else {
      fixedLines.push(line);
    }
  }

  if (needsFix) {
    const fixedFM = fixedLines.join('\n');
    const fixedContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${fixedFM}\n---`);
    writeFileSync(filePath, fixedContent);
    fixed++;
    const rel = filePath.replace(SRC_DIR + '/', '');
    console.log(`🔧 Fixed front matter: ${rel}`);
  }
}

// Now do a second pass to verify all front matter is valid
for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  const fm = extractFrontMatter(content);
  if (!fm) continue;

  // Basic YAML validation: check for common issues
  const lines = fm.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for unquoted colons in values (after initial key: value)
    if (needsQuoting(line)) {
      const rel = filePath.replace(SRC_DIR + '/', '');
      console.error(`❌ YAML error in ${rel} line ${i + 1}: unquoted colon in value`);
      console.error(`   ${line}`);
      errors++;
    }
  }
}

if (fixed > 0) {
  console.log(`\n✅ Auto-fixed ${fixed} files with YAML front matter issues.`);
}
if (errors > 0) {
  console.error(`\n❌ ${errors} unfixable YAML front matter errors found. Build will fail.`);
  process.exit(1);
} else {
  console.log('✅ Front matter validation passed.');
}
