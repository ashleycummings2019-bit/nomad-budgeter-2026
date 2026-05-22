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

    // ─── Sanitization helpers for corrupted Airtable data ───
    // Strips emails, status suffixes, and newlines from city slugs
    const cleanSlug = (raw, notes) => {
        if (!raw || typeof raw !== 'string') return null;
        let slug = raw.trim().toLowerCase();
        
        // Find email match and strip the email (including its username)
        const emailRegex = /(henry\.f|grace\.l)@example\.com/i;
        const emailMatch = slug.match(emailRegex);
        if (emailMatch) {
            slug = slug.substring(0, emailMatch.index).trim();
        }
        
        // Strip known status suffixes that leak from adjacent columns
        slug = slug.replace(/(active|closed|pending|nomad visa)\s*$/i, '');
        // Remove any remaining whitespace or newlines
        slug = slug.replace(/[\s\n\r]+/g, '');

        // Specific content-based routing: if slug is 'tenerife' but notes mention Bucharest, it's Bucharest
        if (slug === 'tenerife' && notes && /bucharest/i.test(notes)) {
            return 'bucharest';
        }
        
        return slug || null;
    };

    // Strips trailing status text and newlines from expert notes
    const cleanExpertNotes = (raw) => {
        if (!raw || typeof raw !== 'string') return '';
        return raw
            .replace(/(Active|Closed|Pending)\s*$/gm, '')
            .replace(/\n+$/, '')
            .trim();
    };

    // Load cache if available
    let cachedData = {};
    if (fs.existsSync(CACHE_PATH)) {
        try {
            const rawCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
            rawCache.forEach(item => {
                const rawSlug = item['City Slug'] || item['slug'];
                const notes = item['Expert Notes'] || item['expertNotes'] || '';
                const slug = cleanSlug(rawSlug, notes);
                if (slug) {
                    const rawCost = item['Visa Cost'] !== undefined ? item['Visa Cost'] : item['visaCost'];
                    const parsedCost = parseInt(rawCost);
                    cachedData[slug] = {
                        taxRate: parseTax(item['Tax Override'] !== undefined ? item['Tax Override'] : item['taxRate']),
                        name: item['Tax Regime Name'] || item['name'] || 'Standard',
                        visaCost: isNaN(parsedCost) ? 2500 : parsedCost,
                        expertNotes: cleanExpertNotes(notes),
                        affiliateUrl: item['Specific Affiliate'] || item['affiliateUrl'] || '',
                        officialVisaPortal: item['Official Visa Portal'] || item['officialVisaPortal'] || ''
                    };
                } else if (rawSlug) {
                    console.warn(`⚠️ Skipped unrecoverable cache slug: "${rawSlug.replace(/\n/g, '\\n')}"`);
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

    // Fetch all records with pagination
    async function fetchAllRecords(tableName) {
        let allRecords = [];
        let offset = null;
        do {
            let url = `https://api.airtable.com/v0/${activeBase}/${encodeURIComponent(tableName)}`;
            if (offset) {
                url += `?offset=${encodeURIComponent(offset)}`;
            }
            const response = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${activeKey}` } });
            
            if (response.status === 404) {
                return { response, ok: false, notFound: true };
            }
            if (!response.ok) {
                return { response, ok: false };
            }
            
            const data = await response.json();
            allRecords = allRecords.concat(data.records);
            offset = data.offset;
        } while (offset);
        
        return { records: allRecords, ok: true };
    }

    try {
        let tableName = 'Tax Overrides';
        let result = await fetchAllRecords(tableName);
        
        if (!result.ok && result.notFound) {
            tableName = 'Table 1';
            result = await fetchAllRecords(tableName);
        }
        
        if (!result.ok) {
            throw new Error(`Airtable API responded with ${result.response ? result.response.status : 'unknown error'}`);
        }
        
        const overrides = { ...cachedData }; // Merge live data over cache
        const rawRecords = [];

        result.records.forEach(record => {
            const fields = record.fields;
            const rawSlug = fields['City Slug'];
            const notes = fields['Expert Notes'] || '';
            const slug = cleanSlug(rawSlug, notes);
            if (slug) {
                const cachedOverride = cachedData[slug];
                let taxRate = parseTax(fields['Tax Override']);
                let name = fields['Tax Regime Name'] || 'Standard';
                
                const rawCost = fields['Visa Cost'];
                let visaCost = rawCost !== undefined ? parseInt(rawCost) : NaN;
                let expertNotes = cleanExpertNotes(notes);
                let affiliateUrl = fields['Specific Affiliate'] || '';
                let officialVisaPortal = fields['Official Visa Portal'] || '';

                if (cachedOverride) {
                    if ((isNaN(visaCost) || visaCost === 2500) && cachedOverride.visaCost !== undefined) {
                        visaCost = cachedOverride.visaCost;
                    }
                    if ((!expertNotes || expertNotes.startsWith('AI Analysis:')) && cachedOverride.expertNotes && !cachedOverride.expertNotes.startsWith('AI Analysis:')) {
                        expertNotes = cachedOverride.expertNotes;
                    }
                    if (!officialVisaPortal && cachedOverride.officialVisaPortal) {
                        officialVisaPortal = cachedOverride.officialVisaPortal;
                    }
                }
                
                if (isNaN(visaCost)) visaCost = 2500;

                overrides[slug] = {
                    taxRate,
                    name,
                    visaCost,
                    expertNotes,
                    affiliateUrl,
                    officialVisaPortal
                };

                rawRecords.push({
                    'City Slug': slug,
                    'Tax Override': fields['Tax Override'],
                    'Tax Regime Name': name,
                    'Visa Cost': visaCost,
                    'Expert Notes': expertNotes,
                    'Specific Affiliate': affiliateUrl,
                    'Official Visa Portal': officialVisaPortal
                });
            } else if (rawSlug) {
                console.warn(`⚠️ Skipped unrecoverable live slug: "${rawSlug.replace(/\n/g, '\\n')}"`);
            }
        });

        // Auto-refresh cache: merge live records INTO existing cache (preserve local-only records)
        if (rawRecords.length > 0) {
            try {
                // Load existing cache to preserve local-only records
                let existingCache = [];
                if (fs.existsSync(CACHE_PATH)) {
                    try { existingCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')); } catch {}
                }
                
                const liveSlugs = new Set(rawRecords.map(r => r['City Slug']));
                // Keep cache records that are NOT in live data (local-only additions)
                const localOnly = existingCache.filter(r => {
                    const slug = cleanSlug(r['City Slug'] || r['slug'], r['Expert Notes'] || '');
                    return slug && !liveSlugs.has(slug);
                });
                
                const merged = [...rawRecords, ...localOnly];
                fs.writeFileSync(CACHE_PATH, JSON.stringify(merged, null, 2));
                console.log(`💾 Cache refreshed: ${rawRecords.length} live + ${localOnly.length} local-only = ${merged.length} total records.`);
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
