#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     ✍️  WRITER AGENT — SEO Content Generator   ║
 * ╚══════════════════════════════════════════════╝
 *
 * Generates long-form comparison guides and blog posts
 * using real data from the NomadBudgeter data layer.
 *
 * Usage:
 *   node backend-intelligence/agents/writer.mjs --cities lisbon,dubai
 *   node backend-intelligence/agents/writer.mjs --topic "best-tax-havens-2026"
 *
 * All output is written as draft Markdown files.
 * NOTHING is published without human review.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { kimiChat, getSessionStats } from '../lib/kimi-client.mjs';
import { startRun, completeRun } from '../lib/supabase-client.mjs';
import { WRITER_PROMPT } from '../lib/prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = resolve(__dirname, '../../src/blog/drafts');

// Ensure drafts directory exists
mkdirSync(DRAFTS_DIR, { recursive: true });

// ─── Load city data for content ───
function getCityData(slug) {
  try {
    const citiesPath = resolve(__dirname, '../../src/_data/cities.json');
    const cities = JSON.parse(readFileSync(citiesPath, 'utf-8'));
    return cities.find(c => c.slug === slug);
  } catch {
    return null;
  }
}

// ─── Parse CLI args ───
function getConfig() {
  const args = process.argv.slice(2);

  // --cities lisbon,dubai
  const citiesArg = args.find(a => a.startsWith('--cities'));
  if (citiesArg) {
    const val = citiesArg.includes('=')
      ? citiesArg.split('=')[1]
      : args[args.indexOf(citiesArg) + 1];
    const slugs = val.split(',').map(c => c.trim());
    return { mode: 'comparison', slugs };
  }

  // --topic "best-tax-havens-2026"
  const topicArg = args.find(a => a.startsWith('--topic'));
  if (topicArg) {
    const val = topicArg.includes('=')
      ? topicArg.split('=')[1]
      : args[args.indexOf(topicArg) + 1];
    return { mode: 'topic', topic: val };
  }

  // --revise src/blog/drafts/file.md
  const reviseArg = args.find(a => a.startsWith('--revise'));
  if (reviseArg) {
    const val = reviseArg.includes('=')
      ? reviseArg.split('=')[1]
      : args[args.indexOf(reviseArg) + 1];
    return { mode: 'revise', file: val };
  }

  // Default: generate a comparison for the most popular matchup
  return { mode: 'comparison', slugs: ['lisbon', 'bali'] };
}

// ─── Generate a city-vs-city comparison ───
async function generateComparison(slugs) {
  if (slugs.length < 2) {
    console.error('❌ Need at least 2 cities for a comparison');
    return null;
  }

  const cityA = getCityData(slugs[0]);
  const cityB = getCityData(slugs[1]);

  if (!cityA || !cityB) {
    console.error(`❌ Could not find data for: ${!cityA ? slugs[0] : slugs[1]}`);
    return null;
  }

  console.log(`\n✍️  Generating: ${cityA.name} vs ${cityB.name}`);

  const userMessage = `Write a comprehensive comparison guide for digital nomads choosing between ${cityA.name} and ${cityB.name} in 2026.

Here is the REAL DATA for each city (use these numbers, do NOT make up your own):

${cityA.name.toUpperCase()}:
- Country: ${cityA.country}
- Cost of Living (monthly): $${cityA.col}
- Tax Rate: ${cityA.tax}%
- Currency: ${cityA.currency}
- Exchange Rate: ${cityA.exchangeRate || 'N/A'} per USD
- Visa: ${cityA.visa || 'Standard tourist visa'}
- Internet Speed: ${cityA.internet || 'Good'}
- Safety Rating: ${cityA.safety || 'N/A'}/10
- Nomad Score (Aura): ${cityA.aura || 'N/A'}
${cityA.prices_usd ? `- Cheap Meal: $${cityA.prices_usd.mealCheap}` : ''}
${cityA.prices_usd ? `- Cappuccino: $${cityA.prices_usd.cappuccino}` : ''}
${cityA.prices_usd ? `- Coworking Day Pass: $${cityA.prices_usd.coworkingDay}` : ''}

${cityB.name.toUpperCase()}:
- Country: ${cityB.country}
- Cost of Living (monthly): $${cityB.col}
- Tax Rate: ${cityB.tax}%
- Currency: ${cityB.currency}
- Exchange Rate: ${cityB.exchangeRate || 'N/A'} per USD
- Visa: ${cityB.visa || 'Standard tourist visa'}
- Internet Speed: ${cityB.internet || 'Good'}
- Safety Rating: ${cityB.safety || 'N/A'}/10
- Nomad Score (Aura): ${cityB.aura || 'N/A'}
${cityB.prices_usd ? `- Cheap Meal: $${cityB.prices_usd.mealCheap}` : ''}
${cityB.prices_usd ? `- Cappuccino: $${cityB.prices_usd.cappuccino}` : ''}
${cityB.prices_usd ? `- Coworking Day Pass: $${cityB.prices_usd.coworkingDay}` : ''}

Cover these sections:
1. Cost of Living Breakdown (with data table)
2. Tax Situation for Remote Workers
3. Visa & Legal Stay Options
4. Internet & Coworking Infrastructure
5. Lifestyle & Community
6. Verdict: Who Should Choose Which City

Use links to: /city/${cityA.slug} and /city/${cityB.slug} for internal linking.
Set today's date in the frontmatter.`;

  const response = await kimiChat({
    system: WRITER_PROMPT,
    user: userMessage,
    thinking: false,
    json: false,
    maxTokens: 8192,
    temperature: 1.0, // Kimi K2.6 requires exactly 1.0
  });

  const filename = `${slugs[0]}-vs-${slugs[1]}-digital-nomads-2026.md`;
  const filepath = resolve(DRAFTS_DIR, filename);

  writeFileSync(filepath, response.content);
  console.log(`   📄 Draft written: src/blog/drafts/${filename}`);
  console.log(`   📊 Tokens: ${response.tokensIn}+${response.tokensOut}, Cost: $${response.cost.toFixed(4)}`);

  return { filename, filepath, cost: response.cost };
}

// ─── Generate a topic-based article ───
async function generateTopicArticle(topic) {
  console.log(`\n✍️  Generating topic article: ${topic}`);

  // Load all cities for data context
  let citiesContext = '';
  try {
    const citiesPath = resolve(__dirname, '../../src/_data/cities.json');
    const cities = JSON.parse(readFileSync(citiesPath, 'utf-8'));

    // Get top 20 cities by aura score for context
    const topCities = cities
      .sort((a, b) => (b.aura || 0) - (a.aura || 0))
      .slice(0, 20)
      .map(c => `${c.name} (${c.country}): CoL $${c.col}, Tax ${c.tax}%, Aura ${c.aura}`)
      .join('\n');

    citiesContext = `\nHere are our top 20 ranked cities for reference:\n${topCities}`;
  } catch { /* Continue without data context */ }

  const userMessage = `Write a comprehensive blog post about: "${topic}"

This is for NomadBudgeter.com — a platform for digital nomads to compare costs, taxes, and lifestyle between global destinations.
${citiesContext}

Target 1,500-2,500 words. Include data tables where relevant.
Use internal links to /city/[slug] pages where applicable.
Set today's date in the frontmatter.`;

  const response = await kimiChat({
    system: WRITER_PROMPT,
    user: userMessage,
    thinking: false,
    json: false,
    maxTokens: 8192,
    temperature: 1.0,
  });

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  const filename = `${slug}.md`;
  const filepath = resolve(DRAFTS_DIR, filename);

  writeFileSync(filepath, response.content);
  console.log(`   📄 Draft written: src/blog/drafts/${filename}`);
  console.log(`   📊 Tokens: ${response.tokensIn}+${response.tokensOut}, Cost: $${response.cost.toFixed(4)}`);

  return { filename, filepath, cost: response.cost };
}

// ─── Revise a draft based on SEO report ───
async function reviseDraft(filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  console.log(`\n✍️  REVISING draft: ${absolutePath}`);
  
  let content = '';
  try {
    content = readFileSync(absolutePath, 'utf-8');
  } catch (e) {
    console.error(`❌ Could not read draft file: ${absolutePath}`);
    return null;
  }

  const reportPath = absolutePath.replace('.md', '-seo-report.json');
  let report = '';
  try {
    report = readFileSync(reportPath, 'utf-8');
  } catch(e) {
    console.error(`❌ Could not find SEO report at ${reportPath}. Please run SEO Optimizer first.`);
    return null;
  }

  const userMessage = `Please revise this Markdown draft based on the following SEO Optimizer Report.
Integrate the suggested title, meta description, H1, add missing keywords naturally, and implement the content recommendations.
Ensure the final output is STILL a complete Markdown document with proper frontmatter. Keep draft: true.

Original Draft:
"""
${content}
"""

SEO Report:
"""
${report}
"""`;

  const response = await kimiChat({
    system: WRITER_PROMPT,
    user: userMessage,
    thinking: false,
    json: false,
    maxTokens: 8192,
    temperature: 1.0,
  });

  writeFileSync(absolutePath, response.content);
  console.log(`   📄 Draft revised: ${absolutePath}`);
  console.log(`   📊 Tokens: ${response.tokensIn}+${response.tokensOut}, Cost: $${response.cost.toFixed(4)}`);

  return { filepath: absolutePath, cost: response.cost };
}

// ─── Main ───
async function main() {
  const config = getConfig();
  console.log('\n✍️  WRITER AGENT — Starting content generation');
  console.log(`   Mode: ${config.mode}`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  const runId = await startRun('content_gen', 1);
  let result;

  if (config.mode === 'comparison') {
    result = await generateComparison(config.slugs);
  } else if (config.mode === 'revise') {
    result = await reviseDraft(config.file);
  } else {
    result = await generateTopicArticle(config.topic);
  }

  const stats = getSessionStats();
  await completeRun(runId, {
    tokensIn: stats.totalTokensIn,
    tokensOut: stats.totalTokensOut,
    cost: stats.totalCost,
    findingsCount: result ? 1 : 0,
  });

  console.log('\n✅ WRITER AGENT — Content generation complete');
  console.log(`   Cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`   ⚠️  Remember: All drafts require human review before publishing.\n`);
}

main().catch(err => {
  console.error('❌ Writer agent crashed:', err);
  process.exit(1);
});
