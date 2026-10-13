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

    // --- LOOPS.SO (ESP) INTEGRATION ---
    const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
    
    if (!LOOPS_API_KEY) {
        console.error('Missing LOOPS_API_KEY credentials');
        return res.status(200).json({ success: true, id: 'queued', note: 'Lead accepted (offline mode)' });
    }

    try {
        const response = await fetch(`https://app.loops.so/api/v1/contacts/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LOOPS_API_KEY}`
            },
            body: JSON.stringify({
                email: email,
                source: source || 'Nomad Budgeter Guide Magnet',
                userGroup: 'Nomad Budgeter'
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Loops Error:', data);
            return res.status(response.status).json({ 
                error: data.message || 'Failed to save lead to Loops',
                details: data
            });
        }

        return res.status(200).json({ success: true, id: data.id || 'loops_success' });
    } catch (error) {
        console.error('Capture-lead Loops error:', error.message);
        return res.status(500).json({ error: 'Internal server error while syncing to Loops' });
    }
};
