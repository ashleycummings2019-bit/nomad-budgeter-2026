#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║        BEST-OF LISTICLE GENERATOR — v1.0     ║
 * ║   Programmatic pSEO Content for Traffic      ║
 * ╚══════════════════════════════════════════════╝
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = resolve(__dirname, '../src/_data/cities.json');
const OUTPUT_DIR = resolve(__dirname, '../src/trends');

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const cities = JSON.parse(readFileSync(CITIES_PATH, 'utf-8'));

const CATEGORIES = [
  {
    slug: 'lowest-tax-digital-nomad-countries-2026',
    title: 'Lowest Tax Digital Nomad Countries (2026 Rankings)',
    description: 'The definitive guide to the world\'s best tax havens for remote workers and digital nomads in 2026.',
    filter: (c) => c.tax !== undefined,
    sort: (a, b) => a.tax - b.tax,
    limit: 10,
    emoji: '📉'
  },
  {
    slug: 'cheapest-nomad-cities-2026',
    title: 'Cheapest Digital Nomad Cities (2026 Monthly Budget)',
    description: 'Live like royalty on a budget. These are the most affordable global hubs for nomads this year.',
    filter: (c) => c.col !== undefined,
    sort: (a, b) => a.col - b.col,
    limit: 12,
    emoji: '💰'
  },
  {
    slug: 'highest-aura-score-nomad-cities',
    title: 'Highest "Aura Score" Nomad Hubs of 2026',
    description: 'Where the lifestyle meets the budget. Cities with the perfect balance of tax, cost, and community.',
    filter: (c) => true,
    sort: (a, b) => (b.aura_score || 0) - (a.aura_score || 0),
    limit: 10,
    emoji: '✨'
  },
  {
    slug: 'safest-nomad-cities-2026',
    title: 'Safest Digital Nomad Cities in 2026',
    description: 'Security and stability are paramount. Here are the top-rated safe havens for remote workers.',
    filter: (c) => c.safety_score !== undefined,
    sort: (a, b) => (b.safety_score || 0) - (a.safety_score || 0),
    limit: 10,
    emoji: '🛡️'
  }
];

function generateMarkdown(cat, list) {
  const date = new Date().toISOString().split('T')[0];
  let content = `---
layout: layouts/base.njk
pageTitle: "${cat.title}"
pageDescription: "${cat.description}"
date: ${date}
permalink: /trends/${cat.slug}/
---

<div class="section-container reveal">
    <div class="text-center mb-16">
        <div class="badge-2026 mb-4">${cat.emoji} 2026 TRENDS</div>
        <h1 class="aura-title text-5xl mb-6">${cat.title}</h1>
        <p class="text-xl text-dim max-w-2xl mx-auto">${cat.description}</p>
    </div>

    <div class="listicle-grid">
        ${list.map((city, i) => `
        <div class="listicle-item glass-panel mb-8">
            <div class="listicle-header">
                <div class="rank-badge">#${i + 1}</div>
                <h2 class="listicle-city">${city.name}, ${city.country}</h2>
            </div>
            
            <div class="listicle-stats">
                <div class="l-stat">
                    <span class="l-label">Monthly Cost</span>
                    <span class="l-value">$${city.col.toLocaleString()}</span>
                </div>
                <div class="l-stat">
                    <span class="l-label">Tax Rate</span>
                    <span class="l-value">${city.tax}%</span>
                </div>
                <div class="l-stat">
                    <span class="l-label">Aura Score</span>
                    <span class="l-value">${city.aura_score || 85}/100</span>
                </div>
            </div>

            <p class="listicle-notes">${city.expertNotes || `Experience the perfect nomadic lifestyle in ${city.name}. With a favorable tax regime and high quality of life, it's a top choice for 2026.`}</p>
            
            <div class="listicle-actions">
                <a href="/compare/city/${city.slug}-vs-london/" class="glass-btn-sm">Compare with London</a>
                <a href="/" class="action-btn-sm accent-bg">Calculate My Savings →</a>
            </div>
        </div>
        `).join('')}
    </div>

    <div class="mt-24 text-center">
        <h3 class="aura-title mb-8">Ready to move?</h3>
        {% include "partials/lead-magnet.njk" %}
    </div>
</div>

<style>
.listicle-item {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}
.listicle-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}
.rank-badge {
    background: var(--aura-primary);
    color: #fff;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.2rem;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}
.listicle-city {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
}
.listicle-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    background: rgba(15, 23, 42, 0.4);
    padding: 1.5rem;
    border-radius: var(--radius-md);
}
.l-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.l-label {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.l-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
}
.listicle-notes {
    color: var(--text-dim);
    line-height: 1.8;
}
.listicle-actions {
    display: flex;
    gap: 1rem;
}
@media (max-width: 600px) {
    .listicle-stats { grid-template-columns: 1fr; }
    .listicle-city { font-size: 1.5rem; }
}
</style>
`;
  return content;
}

CATEGORIES.forEach(cat => {
  const filtered = cities.filter(cat.filter).sort(cat.sort).slice(0, cat.limit);
  const md = generateMarkdown(cat, filtered);
  writeFileSync(resolve(OUTPUT_DIR, `${cat.slug}.njk`), md);
  console.log(`✅ Generated: ${cat.slug}.njk`);
});
