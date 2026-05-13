const { verifyToken } = require('@clerk/clerk-sdk-node');
const { supabaseRequest } = require('./_lib/supabase-client');
const { airtableUpsert } = require('./_lib/airtable-client');

/**
 * api/swarm-findings.js — Manages agent findings queue.
 * GET: Retrieve all findings (ordered by newest).
 * PATCH: Approve/Reject a finding.
 */
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. Verify User (Clerk JWT)
    let userEmail = req.headers['x-user-email'];
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            userEmail = decoded.email;
        } catch (err) {
            console.error('JWT verification failed in swarm-findings:', err);
            // In dev, we might allow bypass if specifically configured
        }
    }

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    try {
        if (req.method === 'GET') {
            const data = await supabaseRequest('swarm_findings', 'GET', {
                params: {
                    order: 'created_at.desc'
                }
            });
            return res.status(200).json(data || []);
        }

        if (req.method === 'PATCH') {
            const { id, status } = req.body;
            if (!id || !status) {
                return res.status(400).json({ error: 'Missing id or status' });
            }

            // 1. Update the finding in Supabase
            const updateResult = await supabaseRequest(`swarm_findings`, 'PATCH', {
                params: {
                    id: `eq.${id}`,
                    select: '*' // Return the updated record
                },
                body: {
                    status,
                    reviewed_by: userEmail,
                    reviewed_at: new Date().toISOString()
                }
            });

            // 2. If approved, sync to Airtable
            if (status === 'approved' && updateResult && updateResult.length > 0) {
                const finding = updateResult[0];
                const { finding_type, country_slug, city_slug, proposed_value } = finding;

                // We target the "Tax Overrides" table for tax/visa changes
                if (finding_type === 'tax_change' || finding_type === 'visa_update') {
                    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
                    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
                    const TABLE_NAME = 'Tax Overrides';

                    const fields = {
                        'City Slug': city_slug || country_slug,
                        'Tax Override': proposed_value.value?.toString() || '',
                        'Tax Regime Name': proposed_value.summary || '',
                        'Expert Notes': proposed_value.reasoning || '',
                        'Visa Cost': proposed_value.visa_cost || 2500
                    };

                    try {
                        console.log(`📡 Syncing approved finding ${id} to Airtable [${TABLE_NAME}]...`);
                        await airtableUpsert(AIRTABLE_BASE_ID, TABLE_NAME, AIRTABLE_API_KEY, fields, 'City Slug');
                    } catch (syncErr) {
                        console.error('❌ Airtable Sync Failed:', syncErr.message);
                        // We still return success for the Supabase update, but log the sync error
                    }
                }
            }

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Swarm API Error:', error);
        res.status(500).json({ error: error.message });
    }
};
