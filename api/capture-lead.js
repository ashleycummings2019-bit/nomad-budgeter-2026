
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

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`, {
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
                            'Source': source || 'Nomad Budgeter Guide Magnet',
                            'Date': new Date().toISOString()
                        }
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Airtable Error:', data);
            let errorMessage = data.error?.message || 'Failed to save lead';
            
            // Helpful hint for common Airtable setup issues
            if (response.status === 404) {
                errorMessage = `Table "${TABLE_NAME}" not found in base. Please ensure your Airtable base has a table named exactly "${TABLE_NAME}".`;
            } else if (response.status === 422) {
                errorMessage = `Airtable Field mismatch. Ensure your "${TABLE_NAME}" table has fields: "Email" (Email/Text), "Source" (Text), and "Date" (Date/Text).`;
            }

            return res.status(response.status).json({ 
                error: errorMessage,
                airtableError: data.error
            });
        }

        return res.status(200).json({ success: true, id: data.records[0].id });
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
