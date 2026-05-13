const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Raw Supabase REST API call — no SDK dependency needed.
 */
async function supabaseRequest(table, method = 'GET', opts = {}) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase configuration missing');
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

    if (opts.select) {
        url.searchParams.set('select', opts.select);
    }

    const fetchOpts = { method, headers };
    if (opts.body) {
        fetchOpts.body = JSON.stringify(opts.body);
    }

    const response = await fetch(url.toString(), fetchOpts);
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${errText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

module.exports = { supabaseRequest };
