const Stripe = require('stripe');
const { airtableUpsert, airtableCreate } = require('./_lib/airtable-client');

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

/**
 * Resilient Airtable logger — uses the shared retry client.
 * Never throws; logs errors but always lets the webhook succeed.
 */
async function logToAirtable(tableName, fields, matchField = null) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.error(`Missing Airtable credentials — skipping ${tableName} log`);
        return;
    }

    try {
        await airtableUpsert(AIRTABLE_BASE_ID, tableName, AIRTABLE_API_KEY, fields, matchField);
        console.log(`✅ Logged to Airtable: ${tableName}`);
    } catch (err) {
        // CRITICAL: Never let an Airtable failure cause a webhook 500.
        // Stripe will retry the webhook if we return non-2xx, which could cause
        // duplicate subscription activations.
        console.error(`🔴 Airtable ${tableName} write failed after retries:`, err.message);
    }
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

    console.log(`🔔 Received event: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email || session.customer_email;
            
            if (session.mode === 'subscription') {
                // Initial subscription creation
                let planName = session.metadata?.plan === 'biz' ? 'Business' : 'Pro';
                
                await logToAirtable('Subscribers', {
                    Email: customerEmail,
                    StripeSubscriptionId: session.subscription,
                    Status: 'Active',
                    Plan: planName,
                    LastPayment: new Date().toISOString().split('T')[0],
                }, 'Email'); // Upsert by Email
            } else if (session.mode === 'payment') {
                // Handle legacy one-time product
                await logToAirtable('Purchases', {
                    Email: customerEmail,
                    City: session.client_reference_id || 'One-time Pro',
                    Status: 'Paid',
                    StripeSessionId: session.id,
                    Amount: (session.amount_total || 0) / 100,
                    Date: new Date().toISOString().split('T')[0],
                });
            }
            break;
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            const customerEmail = invoice.customer_email;
            
            if (invoice.subscription) {
                const lineItem = invoice.lines.data[0];
                const priceId = lineItem?.price?.id;
                
                let planName = 'Pro';
                if (priceId === process.env.STRIPE_BIZ_PRICE_ID || priceId === process.env.STRIPE_BIZ_ANNUAL_PRICE_ID) {
                    planName = 'Business';
                }

                await logToAirtable('Subscribers', {
                    Email: customerEmail,
                    StripeSubscriptionId: invoice.subscription,
                    Status: 'Active',
                    Amount: (invoice.amount_paid || 0) / 100,
                    Plan: planName,
                    LastPayment: new Date().toISOString().split('T')[0],
                }, 'Email');
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            let customerEmail;
            try {
                const customer = await stripe.customers.retrieve(subscription.customer);
                customerEmail = customer.email;
            } catch (err) {
                console.error('Failed to retrieve Stripe customer:', err.message);
                customerEmail = 'unknown';
            }

            await logToAirtable('Subscribers', {
                Email: customerEmail,
                Status: 'Cancelled',
                StripeSubscriptionId: subscription.id
            }, 'Email');

            await logToAirtable('ActivityLogs', {
                Email: customerEmail || 'unknown',
                Action: 'Subscription Cancelled',
                Details: `Sub ID: ${subscription.id}`,
                Date: new Date().toISOString().split('T')[0],
            });
            break;
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            let customerEmail;
            try {
                const customer = await stripe.customers.retrieve(subscription.customer);
                customerEmail = customer.email;
            } catch (err) {
                console.error('Failed to retrieve Stripe customer:', err.message);
                customerEmail = 'unknown';
            }

            await logToAirtable('Subscribers', {
                Email: customerEmail,
                Status: subscription.status === 'active' ? 'Active' : 'Past Due',
                StripeSubscriptionId: subscription.id
            }, 'Email');
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }


    res.status(200).json({ received: true });
};
