#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     🐝 SWARM ORCHESTRATOR — The Coordinator   ║
 * ╚══════════════════════════════════════════════╝
 *
 * Runs the full swarm pipeline:
 *   1. Researcher scans for tax/visa changes
 *   2. Auditor fact-checks the findings
 *   3. Writer drafts content (optional)
 *
 * Usage:
 *   node backend-intelligence/orchestrator.mjs                    # Full pipeline
 *   node backend-intelligence/orchestrator.mjs --scan-only        # Researcher only
 *   node backend-intelligence/orchestrator.mjs --audit-only       # Auditor only
 *   node backend-intelligence/orchestrator.mjs --write lisbon,dubai  # Writer only
 *
 * Safety:
 *   - Hard $5/day budget cap (configurable via SWARM_DAILY_BUDGET)
 *   - Circuit breaker: max 10 agent iterations per run
 *   - All findings go through human review before production
 */

import { getSessionStats } from './lib/kimi-client.mjs';
import { startRun, completeRun } from './lib/supabase-client.mjs';

const MAX_ITERATIONS = 10;

// ─── Dynamic agent imports ───
async function runResearcher(countries) {
  const args = countries ? `--countries ${countries}` : '';
  console.log('\n═══════════════════════════════════════');
  console.log('  PHASE 1: 🔍 RESEARCHER — Scanning...');
  console.log('═══════════════════════════════════════');

  // Fork as child process for isolation
  const { execSync } = await import('child_process');
  try {
    execSync(
      `node backend-intelligence/agents/researcher.mjs ${args}`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 1_800_000, // 30 minute timeout
      }
    );
  } catch (err) {
    console.error('⚠️ Researcher agent exited with error (continuing pipeline)');
  }
}

async function runAuditor() {
  console.log('\n═══════════════════════════════════════');
  console.log('  PHASE 2: 📊 AUDITOR — Fact-checking...');
  console.log('═══════════════════════════════════════');

  const { execSync } = await import('child_process');
  try {
    execSync(
      'node backend-intelligence/agents/auditor.mjs',
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 1_800_000,
      }
    );
  } catch (err) {
    console.error('⚠️ Auditor agent exited with error (continuing pipeline)');
  }
}

async function runWriter(cities) {
  console.log('\n═══════════════════════════════════════');
  console.log('  PHASE 3: ✍️  WRITER — Generating content...');
  console.log('═══════════════════════════════════════');

  const { execSync } = await import('child_process');
  let filepath = '';
  
  try {
    execSync(
      `node backend-intelligence/agents/writer.mjs --cities ${cities}`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 1_800_000,
      }
    );
    
    // Calculate filepath
    const slugs = cities.split(',').map(c => c.trim());
    if (slugs.length >= 2) {
      const filename = `${slugs[0]}-vs-${slugs[1]}-digital-nomads-2026.md`;
      filepath = `src/blog/drafts/${filename}`;
    }
  } catch (err) {
    console.error('⚠️ Writer agent exited with error');
    return;
  }

  if (!filepath) return;

  console.log('\n═══════════════════════════════════════');
  console.log('  PHASE 4: 🔎 SEO OPTIMIZER — Tuning...');
  console.log('═══════════════════════════════════════');
  
  try {
    execSync(
      `node backend-intelligence/agents/seo-optimizer.mjs --file ${filepath}`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 1_800_000,
      }
    );
    
    // Check SEO report score
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const reportPath = resolve(process.cwd(), filepath.replace('.md', '-seo-report.json'));
    
    let needsRevision = false;
    try {
      const reportContent = readFileSync(reportPath, 'utf-8');
      const reportData = JSON.parse(reportContent);
      if (reportData.seo_score !== undefined && reportData.seo_score < 80) {
        console.log(`\n⚠️ SEO Score is ${reportData.seo_score} (below 80 threshold). Triggering revision pass...`);
        needsRevision = true;
      } else if (reportData.seo_score === undefined) {
         console.log(`\n⚠️ No SEO score found in report. Triggering revision pass just in case...`);
         needsRevision = true;
      } else {
         console.log(`\n✅ SEO Score is ${reportData.seo_score}. No revision needed.`);
      }
    } catch (e) {
       console.error('⚠️ Could not read SEO report to check score.', e);
    }
    
    if (needsRevision) {
      console.log('\n═══════════════════════════════════════');
      console.log('  PHASE 5: ✍️  WRITER — Revision pass...');
      console.log('═══════════════════════════════════════');
      execSync(
        `node backend-intelligence/agents/writer.mjs --revise ${filepath}`,
        {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: { ...process.env },
          timeout: 1_800_000,
        }
      );
    }
    
  } catch (err) {
    console.error('⚠️ SEO Optimizer or Writer Revision exited with error');
  }
}

// ─── Parse CLI args ───
function getMode() {
  const args = process.argv.slice(2);

  if (args.includes('--scan-only')) return { mode: 'scan' };
  if (args.includes('--audit-only')) return { mode: 'audit' };

  const writeArg = args.find(a => a.startsWith('--write'));
  if (writeArg) {
    const cities = writeArg.includes('=')
      ? writeArg.split('=')[1]
      : args[args.indexOf(writeArg) + 1] || 'lisbon,bali';
    return { mode: 'write', cities };
  }

  const countriesArg = args.find(a => a.startsWith('--countries'));
  const countries = countriesArg
    ? (countriesArg.includes('=') ? countriesArg.split('=')[1] : args[args.indexOf(countriesArg) + 1])
    : null;

  return { mode: 'full', countries };
}

// ─── Main ───
async function main() {
  const config = getMode();

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🐝 NOMADBUDGETER SWARM ORCHESTRATOR      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Mode:     ${config.mode}`);
  console.log(`  Budget:   $${process.env.SWARM_DAILY_BUDGET || '5.00'}/day`);
  console.log(`  Started:  ${new Date().toISOString()}`);
  console.log(`  LLM:      Kimi K2.6 (Moonshot AI)`);
  console.log('');

  const startTime = Date.now();

  switch (config.mode) {
    case 'scan':
      await runResearcher(config.countries);
      break;

    case 'audit':
      await runAuditor();
      break;

    case 'write':
      await runWriter(config.cities);
      break;

    case 'full':
      // Full pipeline: Scan → Audit → (Writer is manual)
      await runResearcher(config.countries);
      await runAuditor();
      console.log('\n💡 To generate content, run:');
      console.log('   node backend-intelligence/orchestrator.mjs --write lisbon,dubai');
      break;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     🐝 SWARM RUN COMPLETE                    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Duration: ${elapsed}s`);
  console.log(`  Next step: Review findings at your Supabase dashboard`);
  console.log(`  Or run: node backend-intelligence/orchestrator.mjs --audit-only`);
  console.log('');
}

main().catch(err => {
  console.error('❌ Orchestrator crashed:', err);
  process.exit(1);
});
