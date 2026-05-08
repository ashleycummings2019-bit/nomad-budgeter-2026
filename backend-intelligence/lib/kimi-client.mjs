/**
 * ╔══════════════════════════════════════════════╗
 * ║     KIMI K2.6 CLIENT — NomadBudgeter Swarm   ║
 * ║  Moonshot AI / OpenAI-compatible wrapper      ║
 * ╚══════════════════════════════════════════════╝
 *
 * Pricing (May 2026):
 *   Input:  $0.95 / 1M tokens
 *   Output: $4.00 / 1M tokens
 *
 * Features:
 *   - Thinking mode for tax reasoning
 *   - Automatic token/cost tracking
 *   - Budget guard ($5/day default)
 *   - Structured JSON output mode
 */

const KIMI_ENDPOINT = 'https://api.moonshot.ai/v1/chat/completions';
const MODEL = 'kimi-k2.6';

// Pricing per million tokens
const COST_PER_M_INPUT = 0.95;
const COST_PER_M_OUTPUT = 4.00;

// Budget guard
const DAILY_BUDGET_USD = parseFloat(process.env.SWARM_DAILY_BUDGET || '5.00');

// In-memory spend tracker (resets each process run)
let sessionSpend = 0;
let sessionTokensIn = 0;
let sessionTokensOut = 0;

/**
 * Call Kimi K2.6 with full control.
 *
 * @param {object} opts
 * @param {string} opts.system      - System prompt
 * @param {string} opts.user        - User message
 * @param {boolean} [opts.thinking] - Enable "thinking" mode for complex reasoning
 * @param {boolean} [opts.json]     - Request structured JSON output
 * @param {number}  [opts.maxTokens] - Max output tokens (default 4096)
 * @param {number}  [opts.temperature] - Temperature (default 0.3 for precision)
 * @returns {Promise<{content: string, tokensIn: number, tokensOut: number, cost: number}>}
 */
export async function kimiChat(opts) {
  const {
    system,
    user,
    thinking = false,
    json = false,
    maxTokens = 4096,
    temperature = 1,
  } = opts;

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY is not set in environment variables');
  }

  // Budget guard
  if (sessionSpend >= DAILY_BUDGET_USD) {
    throw new Error(
      `🔴 BUDGET EXCEEDED: $${sessionSpend.toFixed(2)} spent (limit: $${DAILY_BUDGET_USD}). ` +
      `Killing agent to prevent runaway costs.`
    );
  }

  const messages = [];

  // System prompt
  if (system) {
    messages.push({ role: 'system', content: system });
  }

  // Enable thinking mode by prefixing the user message
  const userContent = thinking
    ? `Think step-by-step before answering. Show your reasoning.\n\n${user}`
    : user;

  messages.push({ role: 'user', content: userContent });

  const body = {
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 1, // Kimi K2.6 requires exactly 1
  };

  // JSON mode
  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000); // 300s timeout

  try {
    const res = await fetch(KIMI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Kimi API error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';

    // Token tracking
    const tokensIn = data.usage?.prompt_tokens || 0;
    const tokensOut = data.usage?.completion_tokens || 0;
    const cost = (tokensIn / 1_000_000 * COST_PER_M_INPUT) +
                 (tokensOut / 1_000_000 * COST_PER_M_OUTPUT);

    sessionSpend += cost;
    sessionTokensIn += tokensIn;
    sessionTokensOut += tokensOut;

    return { content, tokensIn, tokensOut, cost };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Kimi API request timed out after 300s');
    }
    throw err;
  }
}

/**
 * Parse a JSON response from Kimi, handling markdown fences
 * and thinking-mode preamble text.
 */
export function parseJSON(content) {
  // Strip markdown code fences if present
  let cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try direct parse first (fast path)
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fall through to extraction
  }

  // If direct parse failed, the model likely included thinking preamble.
  // Find the first '{' or '[' and extract the JSON object from there.
  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');

  let start = -1;
  let openChar = '{';
  let closeChar = '}';

  if (objStart === -1 && arrStart === -1) {
    throw new Error(`No JSON found in response: ${cleaned.substring(0, 100)}...`);
  } else if (objStart === -1) {
    start = arrStart; openChar = '['; closeChar = ']';
  } else if (arrStart === -1) {
    start = objStart;
  } else {
    start = Math.min(objStart, arrStart);
    if (start === arrStart) { openChar = '['; closeChar = ']'; }
  }

  // Walk forward to find the matching closing bracket
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = start;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;
    if (depth === 0) { end = i; break; }
  }

  const jsonStr = cleaned.substring(start, end + 1);
  return JSON.parse(jsonStr);
}

/**
 * Get session spend stats.
 */
export function getSessionStats() {
  return {
    totalCost: sessionSpend,
    totalTokensIn: sessionTokensIn,
    totalTokensOut: sessionTokensOut,
    budgetRemaining: DAILY_BUDGET_USD - sessionSpend,
    budgetUsedPct: ((sessionSpend / DAILY_BUDGET_USD) * 100).toFixed(1),
  };
}

export default { kimiChat, parseJSON, getSessionStats };
