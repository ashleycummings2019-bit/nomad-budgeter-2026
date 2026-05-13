/**
 * ╔══════════════════════════════════════════════╗
 * ║     SUPABASE CLIENT — Swarm State Manager     ║
 * ║  Findings queue, run logs, alert subscriptions ║
 * ╚══════════════════════════════════════════════╝
 *
 * This is the swarm's database. Airtable remains the human CMS.
 * Supabase handles:
 *   1. Agent findings queue (pending → approved/rejected)
 *   2. Swarm execution logs (tokens, cost, duration)
 *   3. Alert subscriber management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Only set if not already set by environment
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend ops

/**
 * Raw Supabase REST API call — no SDK dependency needed.
 * Uses the PostgREST API that Supabase exposes.
 */
export async function supabaseRequest(table, method = 'GET', opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️ Supabase not configured — logging to console only');
    return null;
  }

  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);

  // Query params for GET
  if (opts.params) {
    for (const [key, val] of Object.entries(opts.params)) {
      url.searchParams.set(key, val);
    }
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
  };

  // For upsert
  if (opts.upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  }

  // Select specific columns
  if (opts.select) {
    url.searchParams.set('select', opts.select);
  }

  const fetchOpts = { method, headers };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  fetchOpts.signal = controller.signal;

  try {
    const res = await fetch(url.toString(), fetchOpts);
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase ${method} ${table} failed (${res.status}): ${errText}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`⚠️ Supabase unavailable [${table}] (${err.message}). Defaulting to offline mode.`);
    return null;
  }
}

// ─── Findings Queue ───

/**
 * Submit a new finding from an agent for human review.
 */
export async function submitFinding({
  agentType,
  countrySlug,
  citySlug = null,
  findingType,
  currentValue = null,
  proposedValue,
  sourceUrl = null,
  confidence = 0.5,
}) {
  const record = {
    agent_type: agentType,
    country_slug: countrySlug,
    city_slug: citySlug,
    finding_type: findingType,
    current_value: currentValue,
    proposed_value: proposedValue,
    source_url: sourceUrl,
    confidence,
    status: 'pending',
  };

  console.log(`📋 Finding submitted: [${agentType}] ${findingType} for ${countrySlug}${citySlug ? '/' + citySlug : ''} (confidence: ${(confidence * 100).toFixed(0)}%)`);

  const result = await supabaseRequest('swarm_findings', 'POST', { body: record });

  // Fallback: log to console if Supabase is not configured
  if (!result) {
    console.log('📋 FINDING (offline mode):', JSON.stringify(record, null, 2));
  }

  return result;
}

/**
 * Get all pending findings for human review.
 */
export async function getPendingFindings(limit = 50) {
  return supabaseRequest('swarm_findings', 'GET', {
    params: {
      status: 'eq.pending',
      order: 'confidence.desc,created_at.desc',
      limit: String(limit),
    },
  });
}

/**
 * Approve or reject a finding.
 */
export async function reviewFinding(findingId, status, reviewedBy = 'admin') {
  return supabaseRequest(`swarm_findings?id=eq.${findingId}`, 'PATCH', {
    body: {
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    },
  });
}

// ─── Run Logs ───

/**
 * Start a new swarm run (returns the run ID).
 */
export async function startRun(runType, agentsUsed = 1) {
  const record = {
    run_type: runType,
    started_at: new Date().toISOString(),
    agents_used: agentsUsed,
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    findings_count: 0,
    status: 'running',
  };

  const result = await supabaseRequest('swarm_runs', 'POST', { body: record });

  if (result && result[0]) {
    console.log(`🏁 Swarm run started: ${result[0].id} (${runType})`);
    return result[0].id;
  }

  // Offline fallback
  const offlineId = `offline-${Date.now()}`;
  console.log(`🏁 Swarm run started (offline): ${offlineId}`);
  return offlineId;
}

/**
 * Complete a swarm run with final stats.
 */
export async function completeRun(runId, stats) {
  if (runId.startsWith('offline-')) {
    console.log(`✅ Run completed (offline): ${JSON.stringify(stats)}`);
    return null;
  }

  return supabaseRequest(`swarm_runs?id=eq.${runId}`, 'PATCH', {
    body: {
      completed_at: new Date().toISOString(),
      tokens_input: stats.tokensIn || 0,
      tokens_output: stats.tokensOut || 0,
      cost_usd: stats.cost || 0,
      findings_count: stats.findingsCount || 0,
      status: stats.error ? 'failed' : 'completed',
    },
  });
}

// ─── Alert Subscriptions ───

/**
 * Get active alert subscribers for a given country.
 */
export async function getSubscribersForCountry(countrySlug) {
  return supabaseRequest('alert_subscriptions', 'GET', {
    params: {
      active: 'eq.true',
      countries: `cs.{${countrySlug}}`,
    },
  });
}

export default {
  submitFinding,
  getPendingFindings,
  reviewFinding,
  startRun,
  completeRun,
  getSubscribersForCountry,
};
