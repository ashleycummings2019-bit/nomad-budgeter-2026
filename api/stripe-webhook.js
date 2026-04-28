const Stripe = require('stripe');

// Disable Vercel body parsing so we can read the raw body for Stripe signature verification
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

// Helper function to read the raw body from Vercel's req stream
async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error('Missing Stripe environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const customerEmail = session.customer_details?.email || session.customer_email;
        const citySlug = session.client_reference_id; // e.g. "pro_report_Lisbon"

        console.log(`✅ Payment successful: ${customerEmail} — ${citySlug}`);

        // Record purchase in Airtable "Purchases" table
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

        if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
            try {
                const airtableRes = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Purchases')}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            records: [
                                {
                                    fields: {
                                        Email: customerEmail,
                                        City: citySlug || 'Unknown',
                                        Status: 'Paid',
                                        StripeSessionId: session.id,
                                        Amount: (session.amount_total || 0) / 100,
                                        Date: new Date().toISOString().split('T')[0],
                                    },
                                },
                            ],
                        }),
                    }
                );

                if (!airtableRes.ok) {
                    const errData = await airtableRes.json();
                    console.error('Airtable purchase log failed:', errData);
                } else {
                    console.log('✅ Purchase recorded in Airtable');
                }
            } catch (airtableErr) {
                console.error('Airtable network error:', airtableErr.message);
            }
        }
    }

    res.status(200).json({ received: true });
};
