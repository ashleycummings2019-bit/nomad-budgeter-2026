const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { plan, userId, email } = req.body;

    if (!plan || !userId) {
        return res.status(400).json({ error: 'Missing plan or userId' });
    }

    // Price ID Mapping - Supports Monthly and Annual (mapped from .env)
    const prices = {
        'pro_monthly': process.env.STRIPE_PRO_PRICE_ID,
        'pro_annual': process.env.STRIPE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
        'biz_monthly': process.env.STRIPE_BIZ_PRICE_ID,
        'biz_annual': process.env.STRIPE_BIZ_ANNUAL_PRICE_ID || process.env.STRIPE_BIZ_PRICE_ID
    };

    const cycle = req.body.cycle || 'monthly';
    const priceKey = `${plan}_${cycle}`;
    const priceId = prices[priceKey];

    if (!priceId) {
        return res.status(400).json({ error: `Invalid plan/cycle or missing Price ID (${priceKey})` });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin}/dashboard/?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${req.headers.origin}/pricing/?status=cancelled`,
            metadata: {
                userId: userId,
                plan: plan,
                cycle: cycle
            },
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message });
    }
};
