/**
 * Vercel Serverless Proxy — City Data
 * Keeps the API Ninjas key server-side only. Client calls /api/city-data?name=CityName.
 */
export default async function handler(req, res) {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'City API key not configured' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Missing "name" query parameter' });
    }

    try {
        const response = await fetch(
            `https://api.api-ninjas.com/v1/city?name=${encodeURIComponent(name)}`,
            { headers: { 'X-Api-Key': apiKey } }
        );
        if (!response.ok) {
            throw new Error(`Upstream API error: ${response.status}`);
        }
        const data = await response.json();

        // Cache for 24 hours
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
        return res.status(200).json(data);
    } catch (error) {
        console.error('City data proxy error:', error.message);
        return res.status(502).json({ error: 'Failed to fetch city data' });
    }
}
