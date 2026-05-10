#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║     🧠 NOTEBOOK + GEM AUTOMATED ENGINE        ║
 * ╚══════════════════════════════════════════════╝
 *
 * Programmatic implementation of the NotebookLM + Gems workflow.
 * 
 * NOTEBOOK (The Vault): Loads messy data (PDF text, markdown, json)
 * from a specific directory into the Kimi long-context window.
 * 
 * GEM (The Logic): Applies a specialized System Prompt persona
 * (e.g., Legal Scout, Viral Strategist) to process the Vault.
 *
 * Usage:
 *   node backend-intelligence/agents/notebook-gem.mjs --notebook europe-2026 --gem LEGAL_SCOUT --prompt "What are the 3 hidden risks in Spain?"
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { kimiChat, getSessionStats } from '../lib/kimi-client.mjs';
import * as GEMS from '../lib/gem-prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOKS_DIR = resolve(__dirname, '../../notebooks');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    notebook: 'europe-2026',
    gem: 'LEGAL_SCOUT',
    prompt: 'Draft the 2026 Ultimate Tax Guide using the latest updates in the notebook.'
  };

  const nbArg = args.find(a => a.startsWith('--notebook'));
  if (nbArg) config.notebook = nbArg.includes('=') ? nbArg.split('=')[1] : args[args.indexOf(nbArg) + 1];

  const gemArg = args.find(a => a.startsWith('--gem'));
  if (gemArg) config.gem = gemArg.includes('=') ? gemArg.split('=')[1] : args[args.indexOf(gemArg) + 1];

  const promptArg = args.find(a => a.startsWith('--prompt'));
  if (promptArg) config.prompt = promptArg.includes('=') ? promptArg.split('=')[1] : args[args.indexOf(promptArg) + 1];

  return config;
}

function loadNotebook(notebookName) {
  const notebookPath = resolve(NOTEBOOKS_DIR, notebookName);
  
  if (!existsSync(notebookPath)) {
    console.error(`❌ Notebook vault not found: ${notebookPath}`);
    return null;
  }

  console.log(`\n📚 Loading Vault (Notebook): ${notebookName}...`);
  let vaultContent = "";
  const files = readdirSync(notebookPath);
  let fileCount = 0;

  for (const file of files) {
    const fullPath = resolve(notebookPath, file);
    if (statSync(fullPath).isFile()) {
      // Support basic text formats for now
      if (['.txt', '.md', '.json', '.csv'].includes(extname(file).toLowerCase())) {
        vaultContent += `\n\n════════ SOURCE DOCUMENT: ${file} ════════\n`;
        vaultContent += readFileSync(fullPath, 'utf8');
        fileCount++;
      }
    }
  }

  if (fileCount === 0) {
    console.warn(`⚠️  Warning: No valid text documents found in ${notebookName}. Add .md, .txt, .csv or .json files.`);
  } else {
    console.log(`   ✅ Ingested ${fileCount} source documents into context.`);
  }

  return vaultContent;
}

async function main() {
  const config = parseArgs();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🧠 NOTEBOOK + GEM FACTORY STARTED        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Notebook: ${config.notebook}`);
  console.log(`  Gem:      ${config.gem}`);
  console.log(`  Prompt:   "${config.prompt}"\n`);

  // 1. Load the Notebook (Vault)
  const vaultContent = loadNotebook(config.notebook);
  if (vaultContent === null) process.exit(1);

  // 2. Load the Gem (System Persona)
  const gemKey = Object.keys(GEMS).find(k => k.includes(config.gem.toUpperCase()));
  const systemPrompt = gemKey ? GEMS[gemKey] : GEMS.LEGAL_SCOUT_GEM;
  
  console.log(`💎 Attached Gem: ${gemKey || 'LEGAL_SCOUT_GEM (Fallback)'}`);

  // 3. Construct the Augmented Prompt
  const augmentedPrompt = `
NOTEBOOK VAULT DATA:
${vaultContent || "No data provided in notebook."}

USER REQUEST:
${config.prompt}
`;

  console.log(`\n⏳ Processing through Kimi K2.6 (Long-Context)...`);
  
  try {
    const response = await kimiChat({
      system: systemPrompt,
      user: augmentedPrompt,
      thinking: true, // Use thinking for accuracy checking
      json: false,
      maxTokens: 8192,
      temperature: 0.3, // Lower temperature for factual accuracy
    });

    console.log('\n════════════════════ OUTCOME ════════════════════\n');
    console.log(response.content);
    console.log('\n═════════════════════════════════════════════════\n');
    
    const stats = getSessionStats();
    console.log(`📊 Session Stats: Tokens [${stats.totalTokensIn} In / ${stats.totalTokensOut} Out] | Cost: $${stats.totalCost.toFixed(4)}`);

  } catch (err) {
    console.error('❌ Gem execution failed:', err.message);
  }
}

main();
