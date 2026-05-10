const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: 'test@example.com',
            line_items: [
                {
                    price: process.env.STRIPE_PRO_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `http://localhost:3000/dashboard/?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `http://localhost:3000/pricing/?status=cancelled`,
            metadata: {
                userId: 'user_123',
                plan: 'pro',
                cycle: 'monthly'
            },
        });
        console.log("Success! URL:", session.url);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test();
