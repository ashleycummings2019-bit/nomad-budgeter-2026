module.exports = async function() {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    
    // Fallback data if Airtable is not configured or fails
    const fallbackOverrides = {
        "spain": { taxRate: 0.24, name: "Beckham Law", duration: "6 years", maxIncome: 600000 },
        "portugal": { taxRate: 0.20, name: "ITS Regime", duration: "10 years", maxIncome: null },
        "greece": { taxRate: 0.07, name: "Digital Nomad Visa", duration: "7 years", maxIncome: null },
        "italy": { taxRate: 0.05, name: "Lavoratori Impatriati", duration: "5 years", maxIncome: null },
        "bali": { taxRate: 0.00, name: "Remote Worker (B211A)", duration: "6 months+", maxIncome: null },
        "dubai": { taxRate: 0.00, name: "Zero Tax Regime", duration: "Lifetime", maxIncome: null },
        "medellin": { taxRate: 0.00, name: "Foreign Income Exemption", duration: "Indefinite", maxIncome: null },
        "chiang-mai": { taxRate: 0.00, name: "LTR Visa (Remote)", duration: "10 years", maxIncome: null }
    };

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.log("⚠️ No Airtable credentials found. Using local fallback tax overrides.");
        return fallbackOverrides;
    }

    try {
        console.log("Fetching tax overrides from Airtable...");
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Table%201`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
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
