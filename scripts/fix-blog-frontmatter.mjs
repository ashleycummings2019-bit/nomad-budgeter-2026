/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🔧 BLOG FRONTMATTER FIXER — SEO Audit Remediation         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fixes all blog posts:
 *  1. Adds missing `layout: layouts/blog.njk`
 *  2. Fixes broken yaml/``` delimiters to ---
 *  3. Adds noindex + eleventyExcludeFromCollections to draft posts
 *  4. Fixes triple-escaped quote titles
 *
 * Usage:  node scripts/fix-blog-frontmatter.mjs
 */

import fs from 'fs';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'src', 'blog');

// Get all .md files (skip subdirectories like drafts/)
const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.njk'))
    .map(f => path.join(BLOG_DIR, f));

let fixedCount = 0;
let draftCount = 0;
let delimiterCount = 0;
let quoteCount = 0;

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    const basename = path.basename(filePath);

    // ── Fix 1: Broken delimiters (yaml/``` instead of ---) ──────────
    if (content.startsWith('yaml\n') || content.startsWith('yaml\r\n')) {
        content = content.replace(/^yaml\s*\n/, '---\n');
        // Find the closing ``` and replace with ---
        content = content.replace(/\n```\s*\n/, '\n---\n');
        changed = true;
        delimiterCount++;
        console.log(`  🔧 Fixed broken delimiters: ${basename}`);
    }

    // ── Fix 2: Triple-escaped quote titles ──────────────────────────
    // Pattern: title: "\"Actual Title\""
    const escapedQuoteRegex = /^(title:\s*)"\\?"\\?"(.+?)\\?"\\?"$/m;
    if (escapedQuoteRegex.test(content)) {
        content = content.replace(escapedQuoteRegex, '$1"$2"');
        changed = true;
        quoteCount++;
        console.log(`  🔧 Fixed escaped quotes: ${basename}`);
    }
    // Also handle: title: "\"Title\""
    const simpleEscapedRegex = /^(title:\s*)"\\?"(.+?)\\?""\s*$/m;
    if (simpleEscapedRegex.test(content)) {
        content = content.replace(simpleEscapedRegex, '$1"$2"');
        changed = true;
        quoteCount++;
        console.log(`  🔧 Fixed escaped quotes: ${basename}`);
    }

    // ── Ensure file has proper --- frontmatter ──────────────────────
    if (!content.startsWith('---')) {
        console.warn(`  ⚠️ Skipping ${basename} — no frontmatter found`);
        continue;
    }

    const fmEndIndex = content.indexOf('\n---', 3);
    if (fmEndIndex === -1) {
        console.warn(`  ⚠️ Skipping ${basename} — no closing --- found`);
        continue;
    }

    let frontmatter = content.substring(0, fmEndIndex);
    const body = content.substring(fmEndIndex);

    // ── Fix 3: Add missing layout field ─────────────────────────────
    if (!frontmatter.includes('layout:')) {
        frontmatter += '\nlayout: layouts/blog.njk';
        changed = true;
        fixedCount++;
        console.log(`  ✅ Added layout: ${basename}`);
    }

    // ── Fix 4: Add noindex to draft posts ───────────────────────────
    const isDraft = frontmatter.includes('draft: true');
    if (isDraft) {
        if (!frontmatter.includes('noindex:')) {
            frontmatter += '\nnoindex: true';
            changed = true;
            draftCount++;
        }
        if (!frontmatter.includes('eleventyExcludeFromCollections:')) {
            frontmatter += '\neleventyExcludeFromCollections: true';
            changed = true;
        }
        console.log(`  🚫 Added noindex to draft: ${basename}`);
    }

    if (changed) {
        const newContent = frontmatter + body;
        fs.writeFileSync(filePath, newContent);
    }
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║   📊 BLOG FRONTMATTER FIX SUMMARY                          ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`   Layout fields added:     ${fixedCount}`);
console.log(`   Broken delimiters fixed: ${delimiterCount}`);
console.log(`   Escaped quotes fixed:    ${quoteCount}`);
console.log(`   Drafts noindexed:        ${draftCount}`);
console.log(`   Total files scanned:     ${files.length}\n`);
