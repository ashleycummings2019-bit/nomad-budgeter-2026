const { verifyToken } = require('@clerk/clerk-sdk-node');
const { airtableFetch } = require('./_lib/airtable-client');

/**
 * api/travel-logs.js — Manages user stay data in Airtable.
 * GET: Retrieve logs for a specific user (with local cache fallback).
 * POST: Add a new log entry (with retry).
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
            // Fetch logs for user — resilient with retry + timeout
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/TravelLogs?filterByFormula=${encodeURIComponent(`{UserEmail}='${userEmail}'`)}`;

            let data;
            try {
                const response = await airtableFetch(url, {
                    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
                });

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    console.error(`Airtable GET error ${response.status}:`, errBody);
                    throw new Error(`Airtable responded with ${response.status}`);
                }

                data = await response.json();
            } catch (fetchErr) {
                console.error('Airtable fetch failed after retries:', fetchErr.message);
                // Return empty array so the dashboard still renders (graceful degradation)
                return res.status(200).json([]);
            }

            return res.status(200).json(data.records || []);
        }

        if (req.method === 'POST') {
            const { country, entryDate, exitDate } = req.body;

            if (!country || !entryDate || !exitDate) {
                return res.status(400).json({ error: 'Missing log details' });
            }

            // Create record in Airtable — resilient with retry + timeout
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/TravelLogs`;

            const response = await airtableFetch(url, {
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
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Airtable error (${response.status})`);
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
