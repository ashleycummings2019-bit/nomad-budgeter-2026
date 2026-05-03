const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { plan, userId, email } = req.body;

    if (!plan || !userId) {
        return res.status(400).json({ error: 'Missing plan or userId' });
    }

    // Define Prices (in a real app, these would be Stripe Price IDs from your dashboard)
    const prices = {
        pro: 'price_pro_monthly_19', // PLACEHOLDER
        biz: 'price_biz_monthly_99'  // PLACEHOLDER
    };

    const priceId = prices[plan];
    if (!priceId) {
        return res.status(400).json({ error: 'Invalid plan' });
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
                plan: plan
            },
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        res.status(500).json({ error: error.message });
    }
};
