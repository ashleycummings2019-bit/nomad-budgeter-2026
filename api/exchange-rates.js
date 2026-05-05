/**
 * Vercel Serverless Proxy — Exchange Rates
 * Keeps the API key server-side only. Client calls /api/exchange-rates instead.
 */
export default async function handler(req, res) {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Exchange rate API key not configured' });
    }

    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        if (!response.ok) {
            throw new Error(`Upstream API error: ${response.status}`);
        }
        const data = await response.json();

        // Cache for 1 hour on Vercel edge
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
        return res.status(200).json({ conversion_rates: data.conversion_rates });
    } catch (error) {
        console.error('Exchange rate proxy error:', error.message);
        return res.status(502).json({ error: 'Failed to fetch exchange rates' });
    }
}
