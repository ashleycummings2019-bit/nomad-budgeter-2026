#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     🔍 RESEARCHER AGENT — Tax & Visa Scanner  ║
 * ╚══════════════════════════════════════════════╝
 *
 * Scans a list of target countries for tax rate or visa
 * policy changes using Kimi K2.6's multilingual reasoning.
 *
 * Usage:
 *   node backend-intelligence/agents/researcher.mjs
 *   node backend-intelligence/agents/researcher.mjs --countries spain,portugal
 *
 * The agent submits findings to Supabase for human review.
 * It NEVER writes to Airtable directly.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { kimiChat, parseJSON, getSessionStats } from '../lib/kimi-client.mjs';
import { submitFinding, startRun, completeRun } from '../lib/supabase-client.mjs';
import { RESEARCHER_PROMPT } from '../lib/prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load current data from Airtable cache ───
function loadCurrentData() {
  try {
    const citiesPath = resolve(__dirname, '../../src/_data/cities.json');
    const cities = JSON.parse(readFileSync(citiesPath, 'utf-8'));

    // Build a country → tax rate lookup
    const countryData = {};
    for (const city of cities) {
      const country = city.country?.toLowerCase().replace(/\s+/g, '-');
      if (country && !countryData[country]) {
        countryData[country] = {
          country: city.country,
          slug: country,
          currentTaxRate: city.tax,
          currency: city.currency,
          visa: city.visa,
          cities: [],
        };
      }
      if (country) {
        countryData[country].cities.push(city.name);
      }
    }

    return countryData;
  } catch (err) {
    console.warn('⚠️ Could not load current city data:', err.message);
    return {};
  }
}

// ─── Target countries for scanning ───
const DEFAULT_TARGETS = [
  'spain', 'portugal', 'thailand', 'indonesia', 'mexico',
  'colombia', 'georgia', 'croatia', 'czech-republic', 'estonia',
  'germany', 'netherlands', 'japan', 'south-korea', 'uae',
  'turkey', 'hungary', 'romania', 'bulgaria', 'greece',
];

// ─── Parse CLI args ───
function getTargetCountries() {
  const args = process.argv.slice(2);
  const countriesArg = args.find(a => a.startsWith('--countries'));
  if (countriesArg) {
    const val = countriesArg.includes('=')
      ? countriesArg.split('=')[1]
      : args[args.indexOf(countriesArg) + 1];
    return val.split(',').map(c => c.trim());
  }
  return DEFAULT_TARGETS;
}

// ─── Main ───
async function main() {
  const targets = getTargetCountries();
  const currentData = loadCurrentData();

  console.log('\n🔍 RESEARCHER AGENT — Starting tax/visa scan');
  console.log(`   Targets: ${targets.length} countries`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  const runId = await startRun('tax_scan', 1);
  let totalFindings = 0;

  // Batch countries in groups of 5 to control token spend
  const batchSize = 5;
  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    const batchData = {};

    for (const country of batch) {
      batchData[country] = currentData[country] || {
        slug: country,
        currentTaxRate: 'unknown',
        note: 'No existing data — scanning for baseline',
      };
    }

    console.log(`\n📡 Scanning batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);

    const userMessage = `Scan the following countries for any 2025-2026 changes to:
1. Personal income tax rates for foreign remote workers / digital nomads
2. Digital nomad visa programs (new programs, cost changes, requirement changes)
3. Tax treaties affecting remote workers
4. Social security obligations for temporary residents

Here is our CURRENT data for these countries:
${JSON.stringify(batchData, null, 2)}

Report ONLY confirmed changes or new information. If nothing has changed, return an empty findings array.
Focus on official government sources published in 2025 or 2026.`;

    try {
      const response = await kimiChat({
        system: RESEARCHER_PROMPT,
        user: userMessage,
        thinking: true,
        json: true,
        maxTokens: 4096,
        temperature: 1.0,
      });

      const parsed = parseJSON(response.content);
      const findings = parsed.findings || [];

      console.log(`   Found: ${findings.length} potential changes (tokens: ${response.tokensIn}+${response.tokensOut}, cost: $${response.cost.toFixed(4)})`);

      // Submit each finding to Supabase
      for (const finding of findings) {
        if (finding.confidence >= 0.3) {
          await submitFinding({
            agentType: 'researcher',
            countrySlug: finding.country_slug,
            citySlug: finding.city_slug,
            findingType: finding.finding_type,
            currentValue: finding.current_known_value
              ? { value: finding.current_known_value }
              : null,
            proposedValue: {
              value: finding.proposed_new_value,
              summary: finding.summary,
              reasoning: finding.reasoning,
            },
            sourceUrl: finding.source_url,
            confidence: finding.confidence,
          });
          totalFindings++;
        } else {
          console.log(`   ⏭️  Skipped low-confidence finding: ${finding.summary} (${(finding.confidence * 100).toFixed(0)}%)`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Batch failed: ${err.message}`);

      // If budget exceeded, stop immediately
      if (err.message.includes('BUDGET EXCEEDED')) {
        console.error('🔴 Budget limit hit — stopping all scans.');
        break;
      }
    }

    // Small delay between batches to be respectful
    if (i + batchSize < targets.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ─── Complete ───
  const stats = getSessionStats();
  await completeRun(runId, {
    tokensIn: stats.totalTokensIn,
    tokensOut: stats.totalTokensOut,
    cost: stats.totalCost,
    findingsCount: totalFindings,
  });

  console.log('\n✅ RESEARCHER AGENT — Scan complete');
  console.log(`   Findings submitted: ${totalFindings}`);
  console.log(`   Total cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`   Budget remaining: $${stats.budgetRemaining.toFixed(2)} (${stats.budgetUsedPct}% used)`);
  console.log(`   Tokens: ${stats.totalTokensIn.toLocaleString()} in / ${stats.totalTokensOut.toLocaleString()} out\n`);
}

main().catch(err => {
  console.error('❌ Researcher agent crashed:', err);
  process.exit(1);
});
