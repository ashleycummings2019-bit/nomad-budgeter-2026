#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║   🔎 SEO OPTIMIZER AGENT — Metadata tuning   ║
 * ╚══════════════════════════════════════════════╝
 *
 * Scans markdown drafts and optimizes their SEO metadata
 * using the NomadBudgeter SEO constraints.
 *
 * Usage:
 *   node backend-intelligence/agents/seo-optimizer.mjs --file src/blog/drafts/lisbon-vs-dubai.md
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { kimiChat, getSessionStats } from '../lib/kimi-client.mjs';
import { startRun, completeRun } from '../lib/supabase-client.mjs';
import { SEO_OPTIMIZER_PROMPT } from '../lib/prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Parse CLI args ───
function getConfig() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex(a => a === '--file');
  
  if (fileArgIndex === -1 || fileArgIndex + 1 >= args.length) {
    console.error('❌ Missing --file argument. Usage: node seo-optimizer.mjs --file <path>');
    process.exit(1);
  }

  const filePath = args[fileArgIndex + 1];
  return { filePath: resolve(process.cwd(), filePath) };
}

async function optimizeDraft(filePath) {
  let content = '';
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Could not read file: ${filePath}`);
    return null;
  }

  console.log(`\n🔎 SEO OPTIMIZER — Analyzing ${filePath}`);

  const truncatedContent = content.length > 5000 ? content.slice(0, 4000) + '\n\n[... middle content truncated for brevity ...]\n\n' + content.slice(-1000) : content;

  const userMessage = `Review this Markdown draft. Return ONLY a compact JSON object. Keep content_recommendations to max 3 items. Keep keyword_gaps to max 5 items. Keep internal_links_to_add to max 4 items.
  
Draft:
"""
${truncatedContent}
"""`;

  const response = await kimiChat({
    system: SEO_OPTIMIZER_PROMPT,
    user: userMessage,
    thinking: false,
    json: true,
    maxTokens: 3000,
    temperature: 1.0,
  });

  console.log(`   📊 Tokens: ${response.tokensIn}+${response.tokensOut}, Cost: $${response.cost.toFixed(4)}`);
  
  let data;
  try {
    data = JSON.parse(response.content);
  } catch (e) {
    // Attempt to repair truncated JSON
    console.log('⚠️ JSON truncated, attempting repair...');
    let repaired = response.content.trim();
    // Close any open strings
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
    // Close any open arrays
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
    // Close any open objects
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
    
    try {
      data = JSON.parse(repaired);
      console.log('✅ JSON repair successful');
    } catch (e2) {
      console.error('❌ Failed to parse or repair SEO optimization response as JSON');
      console.log(response.content.slice(0, 500));
      return null;
    }
  }
  
  console.log(`\n✅ Optimizations suggested:`);
  console.log(`   SEO Score: ${data.seo_score || 'N/A'}`);
  console.log(`   Title: ${data.title_suggestion}`);
  console.log(`   Meta Description: ${data.meta_description}`);
  console.log(`   Keyword Gaps: ${data.keyword_gaps?.join(', ')}`);
  console.log(`   To add links: ${data.internal_links_to_add?.join(', ')}`);
  
  // Save optimization report alongside the draft
  const reportPath = filePath.replace('.md', '-seo-report.json');
  writeFileSync(reportPath, JSON.stringify(data, null, 2));
  console.log(`\n   💾 SEO report saved to: ${reportPath}`);
  
  return data;
}

// ─── Main ───
async function main() {
  const config = getConfig();
  const runId = await startRun('seo_optimization', 1);
  
  const result = await optimizeDraft(config.filePath);

  const stats = getSessionStats();
  await completeRun(runId, {
    tokensIn: stats.totalTokensIn,
    tokensOut: stats.totalTokensOut,
    cost: stats.totalCost,
    findingsCount: result ? 1 : 0,
  });

  console.log('\n✅ SEO OPTIMIZER AGENT — Run complete');
  console.log(`   Total Cost: $${stats.totalCost.toFixed(4)}\n`);
}

main().catch(err => {
  console.error('❌ SEO Optimizer agent crashed:', err);
  process.exit(1);
});
