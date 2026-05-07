/**
 * airtable-client.js — Bulletproof Airtable client with retry, timeout, and circuit breaker.
 * Shared across all API endpoints to guarantee zero data-fetch failures.
 *
 * Features:
 *   1. Exponential backoff retry (3 attempts by default)
 *   2. Per-request AbortController timeout (8s default)
 *   3. Circuit breaker — after 5 consecutive failures, skip Airtable for 60s
 *   4. Structured error logging
 */

const DEFAULTS = {
    maxRetries: 3,
    timeoutMs: 8000,
    baseDelayMs: 500,       // first retry waits 500ms, then 1s, then 2s
};

// ─── Circuit Breaker (in-memory, per cold start) ───
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 60_000; // 1 minute

function isCircuitOpen() {
    if (consecutiveFailures < CIRCUIT_THRESHOLD) return false;
    if (Date.now() > circuitOpenUntil) {
        // Half-open: allow one probe request
        consecutiveFailures = CIRCUIT_THRESHOLD - 1;
        return false;
    }
    return true;
}

function recordSuccess() {
    consecutiveFailures = 0;
}

function recordFailure() {
    consecutiveFailures++;
    if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
        circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        console.warn(`🔴 Airtable circuit breaker OPEN — skipping requests for ${CIRCUIT_COOLDOWN_MS / 1000}s`);
    }
}

/**
 * Resilient fetch wrapper for Airtable API.
 *
 * @param {string} url         Full Airtable API URL
 * @param {object} options     Standard fetch options (method, headers, body)
 * @param {object} [config]    { maxRetries, timeoutMs }
 * @returns {Promise<Response>} Resolved fetch Response
 * @throws {Error}             Only after all retries exhausted
 */
async function airtableFetch(url, options = {}, config = {}) {
    const { maxRetries, timeoutMs, baseDelayMs } = { ...DEFAULTS, ...config };

    // Circuit breaker check
    if (isCircuitOpen()) {
        throw new Error('Airtable circuit breaker is open — too many recent failures');
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timer);

            // Airtable rate limit (429) — always retry with backoff
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
                const delay = Math.max(retryAfter * 1000, baseDelayMs * Math.pow(2, attempt - 1));
                console.warn(`⏳ Airtable 429 — retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(delay);
                continue;
            }

            // Server errors (5xx) — retry
            if (response.status >= 500) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(`⚠️ Airtable ${response.status} — retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(delay);
                lastError = new Error(`Airtable responded with ${response.status}`);
                continue;
            }

            // Success or client error (4xx other than 429) — return immediately
            recordSuccess();
            return response;
        } catch (err) {
            clearTimeout(timer);

            const isTimeout = err.name === 'AbortError';
            const label = isTimeout ? 'TIMEOUT' : err.code || err.message;

            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(`⚠️ Airtable ${label} — retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(delay);
            }

            lastError = new Error(`Airtable ${label} after ${attempt} attempt(s)`);
        }
    }

    // All retries exhausted
    recordFailure();
    throw lastError;
}

/**
 * Convenience: GET records from an Airtable table.
 */
async function airtableGet(baseId, tableName, apiKey, queryParams = '') {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}${queryParams ? '?' + queryParams : ''}`;
    const response = await airtableFetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.json();
}

/**
 * Convenience: POST (create) records in an Airtable table.
 */
async function airtableCreate(baseId, tableName, apiKey, fields) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    const response = await airtableFetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }] }),
    });
    return response.json();
}

/**
 * Convenience: PATCH (update) a record in an Airtable table.
 */
async function airtablePatch(baseId, tableName, apiKey, recordId, fields) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
    const response = await airtableFetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });
    return response.json();
}

/**
 * Upsert pattern: find by matchField, then PATCH or POST.
 */
async function airtableUpsert(baseId, tableName, apiKey, fields, matchField) {
    // 1. Search for existing record
    if (matchField && fields[matchField]) {
        const filter = encodeURIComponent(`{${matchField}}='${fields[matchField]}'`);
        try {
            const searchData = await airtableGet(baseId, tableName, apiKey, `filterByFormula=${filter}`);
            if (searchData.records && searchData.records.length > 0) {
                const recordId = searchData.records[0].id;
                return airtablePatch(baseId, tableName, apiKey, recordId, fields);
            }
        } catch (err) {
            console.warn(`Upsert search failed for ${tableName}, falling back to create:`, err.message);
        }
    }

    // 2. Create new record
    return airtableCreate(baseId, tableName, apiKey, fields);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    airtableFetch,
    airtableGet,
    airtableCreate,
    airtablePatch,
    airtableUpsert,
};
