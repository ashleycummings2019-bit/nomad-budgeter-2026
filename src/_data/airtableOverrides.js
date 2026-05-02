module.exports = async function() {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    
    // Fallback data if Airtable is not configured or fails
    const fallbackOverrides = {
        "lisbon": { taxRate: 0.20, name: "ITS Regime", visaCost: 1500, expertNotes: "Lisbon remains the primary EU hub in 2026, though the housing crunch is real. Target the 'ITS Regime' for 20% flat tax." },
        "valencia": { taxRate: 0.24, name: "Beckham Law", visaCost: 1200, expertNotes: "The best alternative to Lisbon for 2026. Slightly higher tax (24%) but significantly better housing availability and local infrastructure." },
        "bali": { taxRate: 0.00, name: "Remote Worker (B211A)", visaCost: 600, expertNotes: "Still the budget king. The new 2026 Remote Worker visa is a game changer for long-term stays. Avoid the Canggu traffic if possible." },
        "chiang-mai": { taxRate: 0.00, name: "LTR Visa (Remote)", visaCost: 1600, expertNotes: "Ultra-low CoL with elite infrastructure. The LTR visa is expensive up front but pays off in 0% tax friction over 10 years." },
        "dubai": { taxRate: 0.00, name: "Zero Tax Regime", visaCost: 3500, expertNotes: "The ultimate 0% tax play. High entry cost but zero friction once inside. Best for high-revenue business owners." },
        "medellin": { taxRate: 0.00, name: "Foreign Income Exemption", visaCost: 800, expertNotes: "The LATAM winner for 2026. Strong community and perfect weather, though safety awareness remains paramount." },
        "mexico-city": { taxRate: 0.00, name: "Residente Temporal", visaCost: 400, expertNotes: "Unbeatable culture and timezone alignment for US-based clients. The CDMX nomad community is at an all-time high in 2026." },
        "singapore": { taxRate: 0.15, name: "Standard Tiered", visaCost: 5000, expertNotes: "Premium Asia hub. Expensive but ultra-stable. Use as a base if your business requires a Tier-1 financial jurisdiction." }
    };

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.log("⚠️ No Airtable credentials found. Using local fallback tax overrides.");
        return fallbackOverrides;
    }

    try {
        let tableName = 'Tax Overrides';
        let response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        // Secondary fallback to "Table 1" if "Tax Overrides" doesn't exist
        if (response.status === 404) {
            tableName = 'Table 1';
            console.log(`⚠️ "Tax Overrides" table not found. Retrying with "${tableName}"...`);
            response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`
                }
            });
        }
        
        if (!response.ok) {
            throw new Error(`Airtable API responded with ${response.status}`);
        }
        
        const data = await response.json();
        const overrides = {};
        
        data.records.forEach(record => {
            const fields = record.fields;
            // Map the CSV headers exactly
            if (fields['City Slug']) {
                overrides[fields['City Slug'].toLowerCase()] = {
                    taxRate: fields['Tax Override'] || 0,
                    name: fields['Tax Regime Name'] || 'Standard',
                    visaCost: fields['Visa Cost'] || 2500,
                    expertNotes: fields['Expert Notes'] || '',
                    affiliateUrl: fields['Specific Affiliate'] || ''
                };
            }
        });
        
        console.log("✅ Successfully loaded Airtable tax overrides.");
        return overrides;
    } catch (error) {
        console.error("❌ Failed to fetch from Airtable, falling back to local data:", error.message);
        return fallbackOverrides;
    }
};
