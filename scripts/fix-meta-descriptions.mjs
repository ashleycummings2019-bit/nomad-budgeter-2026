#!/usr/bin/env node
/**
 * Inject missing `description` and `author` fields into programmatic comparison posts.
 * These posts have `meta_description` but are missing the standard `description` and `author`
 * fields that the Eleventy build expects for SEO.
 */
import { readFileSync, writeFileSync } from 'fs';
import { basename } from 'path';

const postsToFix = [
  'src/blog/bali-vs-chiang-mai-digital-nomads-2026.md',
  'src/blog/bali-vs-medellin-digital-nomads-2026.md',
  'src/blog/bangkok-vs-kuala-lumpur-digital-nomads-2026.md',
  'src/blog/barcelona-vs-berlin-digital-nomads-2026.md',
  'src/blog/chiang-mai-vs-dubai-digital-nomads-2026.md',
  'src/blog/dubai-vs-lisbon-digital-nomads-2026.md',
  'src/blog/dubai-vs-singapore-digital-nomads-2026.md',
  'src/blog/lisbon-vs-barcelona-digital-nomads-2026.md',
  'src/blog/lisbon-vs-dubai-digital-nomads-2026.md',
  'src/blog/lisbon-vs-valencia-digital-nomads-2026.md',
  'src/blog/medellin-vs-mexico-city-digital-nomads-2026.md',
  'src/blog/porto-vs-valencia-digital-nomads-2026.md',
  'src/blog/tbilisi-vs-bucharest-digital-nomads-2026.md',
  'src/blog/tbilisi-vs-chiang-mai-digital-nomads-2026.md',
];

let fixed = 0;
let skipped = 0;

for (const file of postsToFix) {
  const content = readFileSync(file, 'utf-8');
  const name = basename(file);

  // Check if already has description field
  if (/^description:/m.test(content)) {
    console.log(`⏭  ${name} — already has description`);
    skipped++;
    continue;
  }

  // Extract the meta_description to use as description
  const metaMatch = content.match(/^meta_description:\s*"?(.+?)"?\s*$/m);
  if (!metaMatch) {
    console.log(`⚠️  ${name} — no meta_description found, skipping`);
    skipped++;
    continue;
  }

  const metaDesc = metaMatch[1].replace(/^"|"$/g, '');

  // Extract title to generate a shorter description if meta_description is very long
  const titleMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m);
  const title = titleMatch ? titleMatch[1].replace(/^"|"$/g, '') : '';

  // Insert description and author after the meta_description line
  const newContent = content.replace(
    /^(meta_description:.*\n)/m,
    `$1description: "${metaDesc}"\nauthor: "Ashley Cummings"\n`
  );

  writeFileSync(file, newContent);
  fixed++;
  console.log(`✅ ${name} — injected description + author`);
}

console.log(`\n📊 Results: ${fixed} fixed, ${skipped} skipped, ${postsToFix.length} total`);
