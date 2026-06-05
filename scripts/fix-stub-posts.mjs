#!/usr/bin/env node
/**
 * Fix the 9 stub comparison posts that have no meta_description, generic titles,
 * or missing metadata. Injects proper frontmatter and marks them as draft.
 */
import { readFileSync, writeFileSync } from 'fs';
import { basename } from 'path';

const fixes = [
  {
    file: 'src/blog/bali-vs-medellin-digital-nomads-2026.md',
    title: 'Bali vs Medellín for Digital Nomads (2026)',
    description: 'Compare Bali and Medellín for digital nomads in 2026: cost of living, tax rates, visa options, coworking, and lifestyle. Find which city stretches your budget further.',
    tags: ['compare', 'bali', 'medellin'],
  },
  {
    file: 'src/blog/chiang-mai-vs-dubai-digital-nomads-2026.md',
    title: 'Chiang Mai vs Dubai for Digital Nomads (2026)',
    description: 'Chiang Mai vs Dubai for digital nomads: $1,100 vs $3,500 monthly costs, 0% tax rates, LTR vs freelance visas, and lifestyle comparison for 2026.',
    tags: ['compare', 'chiang-mai', 'dubai'],
  },
  {
    file: 'src/blog/dubai-vs-lisbon-digital-nomads-2026.md',
    title: 'Dubai vs Lisbon for Digital Nomads (2026)',
    description: 'Dubai vs Lisbon for digital nomads: 0% vs 20% NHR tax, $3,500 vs $2,400 monthly costs, visa pathways, and lifestyle trade-offs in 2026.',
    tags: ['compare', 'dubai', 'lisbon'],
  },
  {
    file: 'src/blog/dubai-vs-singapore-digital-nomads-2026.md',
    title: 'Dubai vs Singapore for Digital Nomads (2026)',
    description: 'Dubai vs Singapore: two 0% tax hubs compared for digital nomads. Cost of living, visa options, infrastructure, and which city builds a bigger savings moat in 2026.',
    tags: ['compare', 'dubai', 'singapore'],
  },
  {
    file: 'src/blog/lisbon-vs-barcelona-digital-nomads-2026.md',
    title: 'Lisbon vs Barcelona for Digital Nomads (2026)',
    description: 'Lisbon vs Barcelona for digital nomads: NHR 2.0 vs Beckham Law, cost of living, visa pathways, and which European city offers the best tax advantage in 2026.',
    tags: ['compare', 'lisbon', 'barcelona'],
  },
  {
    file: 'src/blog/lisbon-vs-valencia-digital-nomads-2026.md',
    title: 'Lisbon vs Valencia for Digital Nomads (2026)',
    description: 'Lisbon vs Valencia for digital nomads: Portugal NHR vs Spain Beckham Law, monthly costs, coworking scenes, and quality of life compared for 2026.',
    tags: ['compare', 'lisbon', 'valencia'],
  },
  {
    file: 'src/blog/medellin-vs-mexico-city-digital-nomads-2026.md',
    title: 'Medellín vs Mexico City for Digital Nomads (2026)',
    description: 'Medellín vs Mexico City for digital nomads: cost of living, tax implications, visa options, safety, and lifestyle. Which Latin American hub wins in 2026?',
    tags: ['compare', 'medellin', 'mexico-city'],
  },
  {
    file: 'src/blog/porto-vs-valencia-digital-nomads-2026.md',
    title: 'Porto vs Valencia for Digital Nomads (2026)',
    description: 'Porto vs Valencia for digital nomads: Portugal NHR vs Spain Beckham Law, monthly budgets, coworking, food costs, and lifestyle quality compared for 2026.',
    tags: ['compare', 'porto', 'valencia'],
  },
  {
    file: 'src/blog/tbilisi-vs-chiang-mai-digital-nomads-2026.md',
    title: 'Tbilisi vs Chiang Mai for Digital Nomads (2026)',
    description: 'Tbilisi vs Chiang Mai for digital nomads: 1% small business tax vs 0% foreign income, $1,200 vs $1,100 monthly costs, and visa options compared for 2026.',
    tags: ['compare', 'tbilisi', 'chiang-mai'],
  },
];

let fixed = 0;

for (const fix of fixes) {
  const content = readFileSync(fix.file, 'utf-8');
  const name = basename(fix.file);

  // Build proper frontmatter
  const newFrontmatter = `---
layout: layouts/blog.njk
title: "${fix.title}"
description: "${fix.description}"
meta_description: "${fix.description}"
date: "2026-05-10"
author: "Ashley Cummings"
tags: ${JSON.stringify(fix.tags)}
draft: true
---`;

  // Replace the existing frontmatter (everything between first --- and second ---)
  const newContent = content.replace(/^---[\s\S]*?---/, newFrontmatter);

  writeFileSync(fix.file, newContent);
  fixed++;
  console.log(`✅ ${name} — fixed title, description, author, tags`);
}

console.log(`\n📊 Fixed ${fixed} stub posts with proper metadata`);
