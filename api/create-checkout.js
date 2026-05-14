// Initialize Stripe lazily to ensure environment variables are available
let stripe;

module.exports = async function createCheckout(req, res) {
    // 1. Check for Secret Key
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        console.error('CRITICAL: STRIPE_SECRET_KEY is missing in environment variables.');
        return res.status(500).json({ 
            error: 'Payment system misconfigured: Missing API Key. Please check Vercel environment variables.' 
        });
    }

    // 2. Initialize Stripe if not already done
    if (!stripe) {
        stripe = require('stripe')(secretKey);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { plan, cycle, userId, email } = req.body;

    if (!plan || !userId || !email) {
        console.error('Missing required checkout parameters:', { plan, userId, email });
        return res.status(400).json({ error: 'Missing plan, userId, or email' });
    }

    // Price ID mapping - fallback to hardcoded IDs if .env missing for critical recovery
    const prices = {
        'pro_monthly': process.env.STRIPE_PRO_PRICE_ID || 'price_1TQ7PH88b0dTya1Rfta01Lhl',
        'pro_annual': process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_1TQ7PH88b0dTya1Rfta01Lhl',
        'biz_monthly': process.env.STRIPE_BIZ_PRICE_ID || 'price_1TSwkU88b0dTya1RRdhBR6wl',
        'biz_annual': process.env.STRIPE_BIZ_ANNUAL_PRICE_ID || 'price_1TSwkU88b0dTya1RRdhBR6wl'
    };

    const priceKey = `${plan}_${cycle || 'monthly'}`;
    const priceId = prices[priceKey];

    if (!priceId) {
        console.error(`Invalid plan/cycle: ${priceKey}`);
        return res.status(400).json({ error: `Invalid plan/cycle or missing Price ID (${priceKey})` });
    }

    try {
        // Robust Base URL detection
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['host'] || 'nomadbudgeter.com';
        const referer = req.headers['referer'];
        
        let baseUrl = `${protocol}://${host}`;
        if (referer) {
            try {
                const refUrl = new URL(referer);
                baseUrl = `${refUrl.protocol}//${refUrl.host}`;
            } catch(e) {
                console.warn('Referer parsing failed, using fallback baseUrl:', e.message);
            }
        }

        // Remove trailing slash if exists
        baseUrl = baseUrl.replace(/\/$/, '');

        console.log(`Creating session for ${email} (${userId}) on ${baseUrl}`);

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            client_reference_id: userId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${baseUrl}/dashboard/?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
            cancel_url: `${baseUrl}/pricing?canceled=true`,
            metadata: {
                plan: plan,
                userId: userId,
                email: email,
                cycle: cycle || 'monthly'
            },
            subscription_data: {
                metadata: {
                    plan: plan,
                    userId: userId,
                    email: email,
                    cycle: cycle || 'monthly'
                },
            },
        });

        console.log('Checkout session created:', session.id);
        return res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
