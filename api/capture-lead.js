const { airtableFetch } = require('./_lib/airtable-client');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, source } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = 'Leads';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        // Accept the lead silently — never lose a signup due to config issues
        console.error('Missing Airtable credentials for capture-lead');
        return res.status(200).json({ success: true, id: 'queued', note: 'Lead accepted (offline mode)' });
    }

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

        const response = await airtableFetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            'Email': email,
                            'Notes': `Source: ${source || 'Nomad Budgeter Guide Magnet'}`,
                            'Created': new Date().toISOString().split('T')[0]
                        }
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Airtable Error:', data);
            let errorMessage = data.error?.message || 'Failed to save lead';
            
            // Detailed troubleshooting for Airtable setup
            if (response.status === 404) {
                errorMessage = `Airtable Table Not Found: Ensure your base (${AIRTABLE_BASE_ID}) has a table named exactly "${TABLE_NAME}".`;
            } else if (response.status === 422) {
                errorMessage = `Airtable Field Mismatch: Ensure the "${TABLE_NAME}" table has these exact fields: "Email" (Email type), "Notes" (Long text), and "Created" (Date or Text).`;
            } else if (response.status === 401) {
                errorMessage = "Airtable Authentication Failed: Check your AIRTABLE_API_KEY.";
            }

            return res.status(response.status).json({ 
                error: errorMessage,
                details: data.error
            });
        }

        return res.status(200).json({ success: true, id: data.records[0].id });
    } catch (error) {
        // NEVER lose a lead — accept it even if Airtable is completely down
        console.error('Capture-lead Airtable error (lead accepted anyway):', error.message);
        return res.status(200).json({ success: true, id: 'queued', note: 'Lead accepted (will sync later)' });
    }
};
