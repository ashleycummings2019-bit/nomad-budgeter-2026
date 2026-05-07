module.exports = async function() {
    const fs = require('fs');
    const path = require('path');
    
    const CACHE_PATH = path.join(__dirname, 'airtable_cache.json');
    
    // Manual .env loading for environments without dotenv
    const envPath = path.join(__dirname, '../../.env');

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                process.env[key.trim()] = value;
            }
        });
    }
    
    const getCreds = () => ({
        key: process.env.AIRTABLE_API_KEY,
        base: process.env.AIRTABLE_BASE_ID
    });

    // ─── Retry-enabled fetch for build time ───
    async function fetchWithRetry(url, options, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000); // 10s timeout for build

            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timer);

                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
                    console.warn(`⏳ Airtable 429 — waiting ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue;
                }

                if (response.status >= 500 && attempt < maxRetries) {
                    const delay = 1000 * Math.pow(2, attempt - 1);
                    console.warn(`⚠️ Airtable ${response.status} — retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }

                return response;
            } catch (err) {
                clearTimeout(timer);
                const label = err.name === 'AbortError' ? 'TIMEOUT' : err.message;
                if (attempt < maxRetries) {
                    const delay = 1000 * Math.pow(2, attempt - 1);
                    console.warn(`⚠️ Airtable ${label} — retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    throw new Error(`Airtable ${label} after ${maxRetries} attempts`);
                }
            }
        }
    }

    // Function to parse percentage strings (e.g., "20%") to decimals (0.2)
    const parseTax = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const clean = val.replace('%', '').trim();
            return parseFloat(clean) / 100;
        }
        return 0;
    };

    // Load cache if available
    let cachedData = {};
    if (fs.existsSync(CACHE_PATH)) {
        try {
            const rawCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
            rawCache.forEach(item => {
                const slug = item['City Slug'] || item['slug'];
                if (slug) {
                    cachedData[slug.toLowerCase()] = {
                        taxRate: parseTax(item['Tax Override'] || item['taxRate']),
                        name: item['Tax Regime Name'] || item['name'] || 'Standard',
                        visaCost: parseInt(item['Visa Cost'] || item['visaCost']) || 2500,
                        expertNotes: item['Expert Notes'] || item['expertNotes'] || '',
                        affiliateUrl: item['Specific Affiliate'] || item['affiliateUrl'] || ''
                    };
                }
            });
            console.log(`📦 Loaded ${Object.keys(cachedData).length} records from Airtable cache.`);
        } catch (e) {
            console.warn("⚠️ Failed to parse Airtable cache:", e.message);
        }
    }

    const { key: activeKey, base: activeBase } = getCreds();

    if (!activeKey || !activeBase) {
        console.log("⚠️ No Airtable credentials found. Using local cache/fallbacks.");
        return { data: cachedData, isLive: false };
    }

    try {
        let tableName = 'Tax Overrides';
        let response = await fetchWithRetry(
            `https://api.airtable.com/v0/${activeBase}/${encodeURIComponent(tableName)}`,
            { headers: { Authorization: `Bearer ${activeKey}` } }
        );
        
        if (response.status === 404) {
            tableName = 'Table 1';
            response = await fetchWithRetry(
                `https://api.airtable.com/v0/${activeBase}/${encodeURIComponent(tableName)}`,
                { headers: { Authorization: `Bearer ${activeKey}` } }
            );
        }

        
        if (!response.ok) {
            throw new Error(`Airtable API responded with ${response.status}`);
        }
        
        const data = await response.json();
        const overrides = { ...cachedData }; // Merge live data over cache
        
        // Also prepare raw records for cache refresh
        const rawRecords = [];

        data.records.forEach(record => {
            const fields = record.fields;
            if (fields['City Slug']) {
                overrides[fields['City Slug'].toLowerCase()] = {
                    taxRate: parseTax(fields['Tax Override']),
                    name: fields['Tax Regime Name'] || 'Standard',
                    visaCost: parseInt(fields['Visa Cost']) || 2500,
                    expertNotes: fields['Expert Notes'] || '',
                    affiliateUrl: fields['Specific Affiliate'] || ''
                };

                rawRecords.push({
                    'City Slug': fields['City Slug'],
                    'Tax Override': fields['Tax Override'],
                    'Tax Regime Name': fields['Tax Regime Name'] || 'Standard',
                    'Visa Cost': fields['Visa Cost'] || 2500,
                    'Expert Notes': fields['Expert Notes'] || '',
                    'Specific Affiliate': fields['Specific Affiliate'] || ''
                });
            }
        });

        // Auto-refresh cache on successful live fetch
        if (rawRecords.length > 0) {
            try {
                fs.writeFileSync(CACHE_PATH, JSON.stringify(rawRecords, null, 2));
                console.log(`💾 Cache refreshed with ${rawRecords.length} live records.`);
            } catch (writeErr) {
                console.warn('⚠️ Failed to write cache file:', writeErr.message);
            }
        }
        
        console.log("✅ Successfully loaded live Airtable tax overrides.");
        return { data: overrides, isLive: true };
    } catch (error) {
        console.error("❌ Failed to fetch from Airtable, falling back to cache:", error.message);
        return { data: cachedData, isLive: false };
    }
};
