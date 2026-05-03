const fs = require('fs');
const path = require('path');

/**
 * B2B API Endpoint: serves high-fidelity city data to Business-tier subscribers.
 */
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    // 1. Verify User & Subscription Status
    // In a production environment, we'd verify the Clerk JWT here.
    // For this flow, we'll check the 'x-user-email' header passed by our dashboard.
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    try {
        // Check Airtable for active Business subscription
        const airtableResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Subscribers?filterByFormula=${encodeURIComponent(`AND({Email}='${userEmail}', {Status}='Active', {Plan}='Business')`)}`,
            {
                headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
            }
        );

        const subscriberData = await airtableResponse.json();
        const isBusinessUser = subscriberData.records && subscriberData.records.length > 0;

        if (!isBusinessUser && userEmail !== 'NB_ADMIN_TEST') { // Allow test admin
            return res.status(403).json({ error: 'Forbidden. Business tier required for API access.' });
        }
    } catch (err) {
        console.error('Subscription verification failed:', err);
        return res.status(500).json({ error: 'Failed to verify subscription status.' });
    }

    try {
        // 2. Load and filter data
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

        // 3. Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = cities.length;
        const paginatedCities = cities.slice(startIndex, endIndex);

        // 4. Data Transformation for B2B use case
        const apiOutput = paginatedCities.map(city => ({
            name: city.name,
            slug: city.slug,
            country: city.country,
            continent: city.continent,
            taxRate: city.tax, // normalized tax rate
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
                continent: continent || 'all'
            },
            data: apiOutput
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
