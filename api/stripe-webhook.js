const Stripe = require('stripe');
const { createClerkClient } = require('@clerk/clerk-sdk-node');
const { airtableUpsert } = require('./_lib/airtable-client');

// Initialize Clerk client
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Disable Vercel body parsing for raw body access
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

// Helper function to read raw body
async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Resilient Airtable logger
 */
async function logToAirtable(tableName, fields, matchField = null) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.error(`[Webhook] Missing Airtable credentials — skipping ${tableName} log`);
        return;
    }

    try {
        await airtableUpsert(AIRTABLE_BASE_ID, tableName, AIRTABLE_API_KEY, fields, matchField);
        console.log(`[Webhook] ✅ Logged to Airtable: ${tableName}`);
    } catch (err) {
        console.error(`[Webhook] 🔴 Airtable ${tableName} write failed:`, err.message);
    }
}

/**
 * Update Clerk User Metadata for immediate UI unlocking
 */
async function updateClerkUser(userId, plan) {
    if (!userId || !process.env.CLERK_SECRET_KEY) {
        console.warn('[Webhook] Skipping Clerk update (missing userId or key)');
        return;
    }

    try {
        await clerkClient.users.updateUser(userId, {
            publicMetadata: {
                subscriptionStatus: 'active',
                plan: plan.toLowerCase(),
                unlockedAt: new Date().toISOString()
            }
        });
        console.log(`[Webhook] 🔓 Clerk metadata updated for user ${userId}`);
    } catch (err) {
        console.error(`[Webhook] Clerk update failed for user ${userId}:`, err.message);
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error('[Webhook] Missing Stripe environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`[Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Webhook] 🔔 Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                
                // Metadata extracted from create-checkout.js OR client_reference_id from Payment Links
                const userId = session.metadata?.userId || session.client_reference_id;
                const email = session.metadata?.email || session.customer_details?.email;
                const plan = session.metadata?.plan || 'Pro';
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                console.log(`[Webhook] Processing successful checkout for ${email}`);

                // 1. Log to Airtable
                await logToAirtable('Subscribers', {
                    Email: email,
                    UserId: userId || "",
                    Status: 'Active',
                    Tier: plan,
                    StripeCustomerId: customerId,
                    StripeSubscriptionId: subscriptionId || "",
                    LastUpdated: new Date().toISOString()
                }, 'Email');

                // 2. Unlock in Clerk
                if (userId) {
                    await updateClerkUser(userId, plan);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customerEmail = invoice.customer_email;
                
                if (invoice.subscription) {
                    const priceId = invoice.lines.data[0]?.price?.id;
                    let planName = 'Pro';
                    if (priceId === process.env.STRIPE_BIZ_PRICE_ID || priceId === process.env.STRIPE_BIZ_ANNUAL_PRICE_ID) {
                        planName = 'Business';
                    }

                    await logToAirtable('Subscribers', {
                        Email: customerEmail,
                        Status: 'Active',
                        Tier: planName,
                        LastPayment: new Date().toISOString()
                    }, 'Email');
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customer = await stripe.customers.retrieve(subscription.customer);
                const email = customer.email;

                await logToAirtable('Subscribers', {
                    Email: email,
                    Status: 'Cancelled',
                    StripeSubscriptionId: subscription.id
                }, 'Email');
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customer = await stripe.customers.retrieve(subscription.customer);
                const email = customer.email;

                await logToAirtable('Subscribers', {
                    Email: email,
                    Status: subscription.status === 'active' ? 'Active' : 'Past Due',
                    StripeSubscriptionId: subscription.id
                }, 'Email');
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event type ${event.type}`);
        }
    } catch (err) {
        console.error(`[Webhook] Critical error during event processing:`, err.message);
    }

    res.status(200).json({ received: true });
};
