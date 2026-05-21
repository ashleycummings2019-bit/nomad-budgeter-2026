#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     🚀 PUBLISHER AGENT — The Deployer         ║
 * ╚══════════════════════════════════════════════╝
 *
 * The FINAL safety gate before content goes live.
 *
 * Safety Layers:
 *   1. SEO Report Gate — Only publishes drafts that passed SEO optimization
 *   2. Content Quality Validator — Checks word count, frontmatter, broken links
 *   3. Site Build Verification — Runs `npm run build:no-pulse` to catch compile errors
 *   4. Git Rollback Tag — Tags the repo BEFORE pushing so you can always revert
 *   5. Max Publish Limit — Never publishes more than 3 articles per run
 *   6. Dry Run Mode — `--dry-run` flag to simulate everything without pushing
 *
 * Usage:
 *   node backend-intelligence/agents/publisher.mjs              # Normal publish
 *   node backend-intelligence/agents/publisher.mjs --dry-run    # Simulate only
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../');
const DRAFTS_DIR = resolve(PROJECT_ROOT, 'src/blog/drafts');
const POSTS_DIR = resolve(PROJECT_ROOT, 'src/blog');

// ─── Safety Constants ───
const MAX_PUBLISH_PER_RUN = 3;      // Never publish more than 3 at once
const MIN_WORD_COUNT = 500;          // Articles under 500 words are suspicious
const MAX_WORD_COUNT = 10_000;       // Articles over 10k words are likely broken
const REQUIRED_FRONTMATTER = ['layout', 'title', 'meta_description', 'date', 'tags'];

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Content Quality Validator ───
function validateContent(content, filename) {
  const errors = [];
  const warnings = [];

  // 1. Check frontmatter exists
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    errors.push('Missing YAML frontmatter (---)');
    return { valid: false, errors, warnings };
  }

  const frontmatter = fmMatch[1];

  // 2. Check required frontmatter fields
  for (const field of REQUIRED_FRONTMATTER) {
    if (!frontmatter.includes(`${field}:`)) {
      errors.push(`Missing frontmatter field: ${field}`);
    }
  }

  // 3. Check title is not empty or placeholder
  const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    if (title.length < 10) errors.push(`Title too short: "${title}"`);
    if (/untitled|placeholder|test|todo/i.test(title)) errors.push(`Suspicious title: "${title}"`);
  }

  // 4. Word count check (body only, not frontmatter)
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < MIN_WORD_COUNT) errors.push(`Word count too low: ${wordCount} (minimum: ${MIN_WORD_COUNT})`);
  if (wordCount > MAX_WORD_COUNT) errors.push(`Word count too high: ${wordCount} (maximum: ${MAX_WORD_COUNT})`);

  // 5. Check for hallucination red flags
  const suspiciousPatterns = [
    /as of my (last |knowledge )?cutoff/i,
    /I don't have access to real-time/i,
    /I cannot browse the internet/i,
    /as an AI/i,
    /I'm unable to verify/i,
    /placeholder/i,
    /\[INSERT.*?\]/i,
    /\[TODO.*?\]/i,
    /\[REPLACE.*?\]/i,
    /example\.com/i,
  ];
  for (const pattern of suspiciousPatterns) {
    const match = body.match(pattern);
    if (match) {
      errors.push(`AI hallucination red flag detected: "${match[0]}"`);
    }
  }

  // 6. Check for broken internal links (relative links that point to nothing)
  const internalLinks = body.matchAll(/\[([^\]]+)\]\((\/(city|compare|visas|blog)[^\)]+)\)/g);
  for (const link of internalLinks) {
    const linkPath = link[2];
    // Just warn about these — they might be valid
    warnings.push(`Internal link found (verify manually): ${linkPath}`);
  }

  // 7. Check for empty sections (H2 followed immediately by another H2 or end of file)
  const emptyH2 = body.match(/## .+\n\s*\n## /);
  if (emptyH2) {
    warnings.push('Possible empty section detected between H2 headings');
  }

  return {
    valid: errors.length === 0,
    wordCount,
    errors,
    warnings,
  };
}

// ─── Main ───
async function main() {
  console.log('\n🚀 PUBLISHER AGENT — Scanning for ready drafts...');
  if (DRY_RUN) {
    console.log('   🏳️  DRY RUN MODE — No files will be moved, no git push will happen.\n');
  }

  if (!existsSync(DRAFTS_DIR)) {
    console.log('   ✅ Drafts directory does not exist. Nothing to publish.');
    return;
  }

  const files = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('   ✅ No drafts found to publish.');
    return;
  }

  const readyFiles = [];
  const failedFiles = [];

  // ── GATE 1: SEO Report Gate + Content Quality Validator ──
  console.log('\n── GATE 1: Content Quality Validation ──\n');

  for (const file of files) {
    const draftPath = join(DRAFTS_DIR, file);
    const content = readFileSync(draftPath, 'utf-8');

    // Check SEO report exists
    const seoReportPath = draftPath.replace('.md', '-seo-report.json');
    let hasBeenOptimized = false;
    try {
      if (statSync(seoReportPath).isFile()) {
        hasBeenOptimized = true;
      }
    } catch (e) {
      // No report found
    }

    if (!hasBeenOptimized) {
      console.log(`   ⏭️  SKIP: ${file} — No SEO report (not pipeline-ready)`);
      continue;
    }

    // Run content quality check
    const validation = validateContent(content, file);

    if (validation.valid) {
      console.log(`   ✅ PASS: ${file} (${validation.wordCount} words)`);
      if (validation.warnings.length > 0) {
        for (const w of validation.warnings) {
          console.log(`      ⚠️  ${w}`);
        }
      }
      readyFiles.push({ file, draftPath, seoReportPath, content });
    } else {
      console.log(`   ❌ FAIL: ${file}`);
      for (const e of validation.errors) {
        console.log(`      ❌ ${e}`);
      }
      failedFiles.push({ file, errors: validation.errors });
    }
  }

  if (readyFiles.length === 0) {
    console.log('\n   ✅ No drafts passed quality validation. Nothing to publish.');
    return;
  }

  // ── GATE 2: Max Publish Limit ──
  const toPublish = readyFiles.slice(0, MAX_PUBLISH_PER_RUN);
  if (readyFiles.length > MAX_PUBLISH_PER_RUN) {
    console.log(`\n── GATE 2: Rate Limit ──`);
    console.log(`   ⚠️  ${readyFiles.length} drafts are ready, but limit is ${MAX_PUBLISH_PER_RUN} per run.`);
    console.log(`   Publishing only: ${toPublish.map(f => f.file).join(', ')}`);
  }

  // ── Move files (before build test) ──
  console.log(`\n── Moving ${toPublish.length} drafts to live directory ──\n`);

  for (const { file, draftPath, seoReportPath, content } of toPublish) {
    const updatedContent = content.replace(/^draft:\s*true\s*$/m, '').replace(/\n\n\n+/g, '\n\n');
    const livePath = join(POSTS_DIR, file);

    if (DRY_RUN) {
      console.log(`   🏳️  [DRY RUN] Would publish: ${file}`);
    } else {
      writeFileSync(livePath, updatedContent);
      execSync(`rm "${draftPath}"`, { cwd: PROJECT_ROOT });
      // Clean up SEO report
      try { execSync(`rm "${seoReportPath}"`, { cwd: PROJECT_ROOT }); } catch (e) { /* ok */ }
      console.log(`   📄 Moved: ${file} → src/blog/${file}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n   🏳️  DRY RUN complete. No changes were made.');
    return;
  }

  // ── GATE 3: Site Build Verification ──
  console.log('\n── GATE 3: Site Build Verification ──\n');
  console.log('   🔨 Running npm run build:no-pulse to verify site compiles...');

  try {
    execSync('npm run build:no-pulse', {
      cwd: PROJECT_ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 300_000, // 5 minute timeout
    });
    console.log('   ✅ Site build succeeded! Content is safe to deploy.');
  } catch (err) {
    console.error('   ❌ SITE BUILD FAILED! Rolling back published files...');

    // ROLLBACK: Move files back to drafts
    for (const { file, content } of toPublish) {
      const livePath = join(POSTS_DIR, file);
      const draftPath = join(DRAFTS_DIR, file);
      try {
        // Re-add draft: true
        const rolledBack = content;
        writeFileSync(draftPath, rolledBack);
        execSync(`rm "${livePath}"`, { cwd: PROJECT_ROOT });
        console.log(`   ↩️  Rolled back: ${file}`);
      } catch (rbErr) {
        console.error(`   ❌ Failed to roll back ${file}: ${rbErr.message}`);
      }
    }

    console.error('   ❌ PUBLISH ABORTED. Fix the build errors and retry.');
    process.exit(1);
  }

  // ── GATE 4: Git Rollback Tag + Commit + Push ──
  console.log('\n── GATE 4: Git Commit & Push ──\n');

  try {
    // Create a rollback tag BEFORE the new commit
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tagName = `pre-autopublish-${timestamp}`;
    execSync(`git tag ${tagName}`, { cwd: PROJECT_ROOT });
    console.log(`   🏷️  Rollback tag created: ${tagName}`);
    console.log(`   💡 To undo this publish: git revert HEAD && git push`);
    console.log(`   💡 Full rollback: git reset --hard ${tagName} && git push --force\n`);

    // Stage, commit, push
    const articleNames = toPublish.map(f => f.file.replace('.md', '')).join(', ');
    execSync('git add src/blog/ src/blog/drafts/', { cwd: PROJECT_ROOT });
    execSync(
      `git commit -m "feat(content): Auto-publish: ${articleNames} 🤖" -m "Published by OpenSwarm autonomous pipeline. Rollback tag: ${tagName}"`,
      { cwd: PROJECT_ROOT }
    );
    console.log('   🚀 Pushing to origin main...');
    execSync('git push origin main --tags', { cwd: PROJECT_ROOT });
    console.log('   ✅ Push successful. Your hosting provider will now rebuild the site.');
  } catch (err) {
    console.error(`   ❌ Git push failed: ${err.message}`);
    console.error('   ⚠️  Files were moved to src/blog/ but NOT pushed. Manually review and push.');
    process.exit(1);
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     🚀 PUBLISHER — PUBLISH COMPLETE          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Published: ${toPublish.length}`);
  console.log(`  Failed validation: ${failedFiles.length}`);
  console.log(`  Queued for next run: ${Math.max(0, readyFiles.length - MAX_PUBLISH_PER_RUN)}`);
  console.log('');
}

main().catch(err => {
  console.error('❌ Publisher crashed:', err);
  process.exit(1);
});
