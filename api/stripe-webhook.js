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

// Helper to log or update data in Airtable
async function logToAirtable(tableName, fields, matchField = null) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.error('Missing Airtable credentials');
        return;
    }

    try {
        let recordId = null;

        // If a matchField is provided, try to find an existing record to update
        if (matchField && fields[matchField]) {
            const filter = encodeURIComponent(`{${matchField}}='${fields[matchField]}'`);
            const searchResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?filterByFormula=${filter}`,
                {
                    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
                }
            );
            const searchData = await searchResponse.json();
            if (searchData.records && searchData.records.length > 0) {
                recordId = searchData.records[0].id;
            }
        }

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}${recordId ? `/${recordId}` : ''}`;
        const method = recordId ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(recordId ? { fields } : { records: [{ fields }] }),
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error(`Airtable ${tableName} ${method} failed:`, errData);
        } else {
            console.log(`✅ ${method === 'PATCH' ? 'Updated' : 'Created'} record in Airtable: ${tableName}`);
        }
    } catch (err) {
        console.error(`Airtable error (${tableName}):`, err.message);
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
                if (priceId === process.env.STRIPE_BIZ_PRICE_ID) {
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
            const customer = await stripe.customers.retrieve(subscription.customer);
            const customerEmail = customer.email;

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
            const customer = await stripe.customers.retrieve(subscription.customer);
            const customerEmail = customer.email;

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
