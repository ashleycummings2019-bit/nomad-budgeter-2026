#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     🚀 PUBLISHER AGENT — The Deployer         ║
 * ╚══════════════════════════════════════════════╝
 *
 * Scans src/blog/drafts/ for any markdown files that
 * are ready to be published.
 * 1. Removes `draft: true`
 * 2. Moves file to src/blog/
 * 3. Commits and pushes to GitHub to trigger deploy
 */

import { readdirSync, readFileSync, writeFileSync, renameSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../');
const DRAFTS_DIR = resolve(PROJECT_ROOT, 'src/blog/drafts');
const POSTS_DIR = resolve(PROJECT_ROOT, 'src/blog');

async function main() {
  console.log('\n🚀 PUBLISHER AGENT — Scanning for ready drafts...');
  
  if (!process.env.SUPABASE_URL) {
    console.log('   ⚠️ Running in local mode (no DB checks)');
  }

  const files = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.log('   ✅ No drafts found to publish.');
    return;
  }

  let publishedCount = 0;

  for (const file of files) {
    const draftPath = join(DRAFTS_DIR, file);
    const content = readFileSync(draftPath, 'utf-8');

    // Only auto-publish if it has an SEO report next to it (meaning it went through the full pipeline)
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
      console.log(`   ⏭️  Skipping ${file} — No SEO optimization report found.`);
      continue;
    }

    console.log(`   ✅ Publishing ${file}...`);

    // 1. Remove draft: true from frontmatter
    const updatedContent = content.replace(/^draft:\s*true\s*$/m, '').replace(/\n\n+/g, '\n\n');
    
    // 2. Write and Move file
    const livePath = join(POSTS_DIR, file);
    writeFileSync(livePath, updatedContent);
    
    // Remove the original draft and its SEO report
    execSync(`rm "${draftPath}" "${seoReportPath}"`, { cwd: PROJECT_ROOT });

    publishedCount++;
  }

  if (publishedCount > 0) {
    console.log(`\n   📦 Committing ${publishedCount} new articles to Git...`);
    try {
      execSync('git add src/blog/', { cwd: PROJECT_ROOT });
      execSync('git commit -m "feat(content): Auto-publish autonomous swarm content 🤖"', { cwd: PROJECT_ROOT });
      console.log(`   🚀 Pushing to origin main...`);
      execSync('git push origin main', { cwd: PROJECT_ROOT });
      console.log('   ✅ Push successful. Vercel/Netlify will now build the site.');
    } catch (err) {
      console.error(`   ❌ Failed to push to Git: ${err.message}`);
    }
  } else {
    console.log('   ✅ No fully optimized drafts were ready to publish.');
  }
}

main().catch(err => {
  console.error('❌ Publisher crashed:', err);
  process.exit(1);
});
