const fs = require('fs');
const path = require('path');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const { airtableFetch } = require('../_lib/airtable-client');

/**
 * B2B API Endpoint: serves high-fidelity city data to Business-tier subscribers.
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const ADMIN_BYPASS_KEY = 'NB_ADMIN_TEST';

    // 1. Rate Limiting (Basic In-Memory for Serverless)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const userLimit = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };

    if (now > userLimit.reset) {
        userLimit.count = 1;
        userLimit.reset = now + RATE_LIMIT_WINDOW;
    } else {
        userLimit.count++;
    }
    rateLimitMap.set(ip, userLimit);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - userLimit.count));

    if (userLimit.count > MAX_REQUESTS) {
        return res.status(429).json({ 
            error: 'Too Many Requests', 
            message: 'Rate limit exceeded. Please try again later.' 
        });
    }

    // 2. Verify User & Subscription Status
    let userEmail = req.headers['x-user-email'];
    const authHeader = req.headers['authorization'];

    // Formal Auth Verification (Clerk JWT)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
            userEmail = decoded.email;
            console.log('JWT verified successfully for:', userEmail);
            
            // For now, we'll continue to support the header if the token is present but we can't verify yet
            console.log('JWT detected, proceeding with verification logic...');
        } catch (err) {
            console.error('JWT verification failed:', err);
            return res.status(401).json({ error: 'Invalid authentication token.' });
        }
    }
    
    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    // 2. Admin Bypass & Subscription Check
    if (userEmail !== ADMIN_BYPASS_KEY) {
        try {
            // Check Airtable for active Business subscription — resilient with retry
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Subscribers?filterByFormula=${encodeURIComponent(`AND({Email}='${userEmail}', {Status}='Active', {Plan}='Business')`)}`;
            
            const airtableResponse = await airtableFetch(url, {
                headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
            });

            const subscriberData = await airtableResponse.json();
            const isBusinessUser = subscriberData.records && subscriberData.records.length > 0;

            if (!isBusinessUser) {
                return res.status(403).json({ 
                    error: 'Forbidden. Business tier required for API access.',
                    message: 'Upgrade at https://www.nomadbudgeter.com/pricing'
                });
            }
        } catch (err) {
            // FAIL-OPEN: If Airtable is down, allow authenticated users through
            // rather than locking paying customers out of the API they're paying for.
            console.error('Subscription verification failed (allowing through):', err.message);
        }
    } else {
        console.log('Admin bypass triggered for NB_ADMIN_TEST');
    }

    try {
        // 3. Load and filter data
        const citiesPath = path.join(process.cwd(), 'src/_data/cities.json');
        if (!fs.existsSync(citiesPath)) {
            return res.status(500).json({ error: 'Data source not found' });
        }

        const rawData = fs.readFileSync(citiesPath, 'utf-8');
        let cities = JSON.parse(rawData);

        // Filter by continent if provided
        const { continent, page = 1, limit = 50 } = req.query;
        if (continent) {
            cities = cities.filter(c => c.continent?.toLowerCase() === continent.toLowerCase());
        }

        // 4. Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = cities.length;
        const paginatedCities = cities.slice(startIndex, endIndex);

        // 5. Data Transformation for B2B use case
        const apiOutput = paginatedCities.map(city => ({
            name: city.name,
            slug: city.slug,
            country: city.country,
            continent: city.continent,
            taxRate: city.tax, 
            costOfLivingUsd: city.col,
            rentUsd: city.rent,
            visaRegime: city.visa,
            visaMinIncome: city.visaMinIncome,
            lastUpdated: city.pulse_updated
        }));

        res.status(200).json({
            status: 'success',
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                continent: continent || 'all',
                plan: userEmail === ADMIN_BYPASS_KEY ? 'Admin' : 'Business'
            },
            data: apiOutput
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

