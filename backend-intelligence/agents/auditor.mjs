#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     📊 AUDITOR AGENT — Fact-Checker            ║
 * ╚══════════════════════════════════════════════╝
 *
 * Pulls pending findings from Supabase, cross-references them
 * against current Airtable data, and assigns a verdict.
 *
 * Usage:
 *   node backend-intelligence/agents/auditor.mjs
 *
 * This agent is the "skeptic" — it catches hallucinations
 * before they reach production data.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { kimiChat, parseJSON, getSessionStats } from '../lib/kimi-client.mjs';
import { getPendingFindings, reviewFinding, startRun, completeRun } from '../lib/supabase-client.mjs';
import { AUDITOR_PROMPT } from '../lib/prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load current production data for comparison ───
function loadCurrentData() {
  try {
    const citiesPath = resolve(__dirname, '../../src/_data/cities.json');
    const cities = JSON.parse(readFileSync(citiesPath, 'utf-8'));

    const countriesPath = resolve(__dirname, '../../src/_data/countries.json');
    const countries = JSON.parse(readFileSync(countriesPath, 'utf-8'));

    return { cities, countries };
  } catch (err) {
    console.warn('⚠️ Could not load production data:', err.message);
    return { cities: [], countries: [] };
  }
}

// ─── Main ───
async function main() {
  console.log('\n📊 AUDITOR AGENT — Starting fact-check run');
  console.log(`   Date: ${new Date().toISOString()}\n`);

  // 1. Get pending findings
  const findings = await getPendingFindings(20);

  if (!findings || findings.length === 0) {
    console.log('✅ No pending findings to audit. Queue is clean.\n');
    return;
  }

  console.log(`   Pending findings: ${findings.length}`);

  const runId = await startRun('audit', 1);
  const { cities, countries } = loadCurrentData();
  let audited = 0;
  let autoApproved = 0;
  let autoRejected = 0;
  let needsReview = 0;

  // Process findings in batches of 5
  const batchSize = 5;
  for (let i = 0; i < findings.length; i += batchSize) {
    const batch = findings.slice(i, i + batchSize);

    // Gather relevant current data for each finding
    const contextData = batch.map(f => {
      const relevantCities = cities.filter(c =>
        c.country?.toLowerCase().replace(/\s+/g, '-') === f.country_slug
      );

      return {
        finding_id: f.id,
        agent_type: f.agent_type,
        finding_type: f.finding_type,
        country: f.country_slug,
        city: f.city_slug,
        proposed: f.proposed_value,
        source_url: f.source_url,
        confidence: f.confidence,
        our_current_data: relevantCities.map(c => ({
          city: c.name,
          tax: c.tax,
          visa: c.visa,
          col: c.col,
        })),
      };
    });

    const userMessage = `Audit the following findings against our current production data.

FINDINGS TO AUDIT:
${JSON.stringify(contextData, null, 2)}

For each finding, determine:
1. Is this a genuine change from our current data?
2. Does the source URL look legitimate?
3. What confidence level would you assign?
4. Should we approve, reject, or flag for human review?`;

    try {
      const response = await kimiChat({
        system: AUDITOR_PROMPT,
        user: userMessage,
        thinking: true,
        json: true,
        maxTokens: 4096,
        temperature: 1.0, // Kimi K2.6 requires exactly 1.0
      });

      const parsed = parseJSON(response.content);
      const results = parsed.audit_results || [];

      console.log(`\n   Batch ${Math.floor(i / batchSize) + 1} audited (cost: $${response.cost.toFixed(4)})`);

      for (const result of results) {
        const finding = batch.find(f => f.id === result.finding_id);
        if (!finding) continue;

        // Auto-action based on auditor recommendation
        if (result.recommendation === 'approve' && result.confidence_adjustment >= 0.85) {
          // High confidence approval — Auto-Approve it to the Database
          await reviewFinding(finding.id, 'approved', 'auditor-agent');
          console.log(`   ✅ HIGH CONFIDENCE (AUTO-APPROVED): ${finding.country_slug} — ${result.reasoning?.slice(0, 80)}`);
          autoApproved++;
        } else if (result.recommendation === 'reject') {
          // Auto-reject obvious hallucinations
          await reviewFinding(finding.id, 'rejected', 'auditor-agent');
          console.log(`   ❌ REJECTED: ${finding.country_slug} — ${result.reasoning?.slice(0, 80)}`);
          autoRejected++;
        } else {
          // Needs human eyes
          console.log(`   👤 NEEDS REVIEW: ${finding.country_slug} — ${result.reasoning?.slice(0, 80)}`);
          needsReview++;
        }

        audited++;
      }
    } catch (err) {
      console.error(`   ❌ Audit batch failed: ${err.message}`);
      if (err.message.includes('BUDGET EXCEEDED')) break;
    }

    if (i + batchSize < findings.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // ─── Complete ───
  const stats = getSessionStats();
  await completeRun(runId, {
    tokensIn: stats.totalTokensIn,
    tokensOut: stats.totalTokensOut,
    cost: stats.totalCost,
    findingsCount: audited,
  });

  console.log('\n✅ AUDITOR AGENT — Audit complete');
  console.log(`   Audited: ${audited}`);
  console.log(`   Auto-rejected (hallucinations): ${autoRejected}`);
  console.log(`   High-confidence (ready for approval): ${autoApproved}`);
  console.log(`   Needs human review: ${needsReview}`);
  console.log(`   Cost: $${stats.totalCost.toFixed(4)}\n`);
}

main().catch(err => {
  console.error('❌ Auditor agent crashed:', err);
  process.exit(1);
});
