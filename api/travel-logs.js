const { verifyToken } = require('@clerk/clerk-sdk-node');

/**
 * api/travel-logs.js — Manages user stay data in Airtable.
 * GET: Retrieve logs for a specific user.
 * POST: Add a new log entry.
 */
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. Verify User
    let userEmail = req.headers['x-user-email'];
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            userEmail = decoded.email;
        } catch (err) {
            console.error('JWT verification failed in travel-logs:', err);
            // Fallback to header for now if needed, but in strict mode we'd return 401
        }
    }

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return res.status(500).json({ error: 'Airtable configuration missing' });
    }

    try {
        if (req.method === 'GET') {
            // Fetch logs for user
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/TravelLogs?filterByFormula=${encodeURIComponent(`{UserEmail}='${userEmail}'`)}`,
                {
                    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
                }
            );

            const data = await response.json();
            return res.status(200).json(data.records || []);
        }

        if (req.method === 'POST') {
            const { country, entryDate, exitDate } = req.body;

            if (!country || !entryDate || !exitDate) {
                return res.status(400).json({ error: 'Missing log details' });
            }

            // Create record in Airtable
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/TravelLogs`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        records: [{
                            fields: {
                                UserEmail: userEmail,
                                Country: country,
                                EntryDate: entryDate,
                                ExitDate: exitDate
                            }
                        }]
                    }),
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Airtable error');
            }

            const data = await response.json();
            return res.status(201).json(data.records[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Travel Logs Error:', error);
        res.status(500).json({ error: error.message });
    }
};
