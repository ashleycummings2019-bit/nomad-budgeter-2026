import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Vercel parses the body as a stream or string depending on config.
    // For Stripe webhooks, we need the raw body.
    // However, Vercel Serverless Functions auto-parse JSON by default.
    // To get the raw body, we must read it from the stream.
    
    // Instead of dealing with raw bodies which is tricky in Vercel, 
    // we can use a micro helper or just try to construct the event from the parsed body if testing,
    // but proper way is using raw body.
    
    // Actually, Vercel requires exporting a config to disable body parsing for Stripe webhooks:
    // export const config = { api: { bodyParser: false } };
    
    // Then we read the raw body:
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const customerEmail = session.customer_details?.email || session.customer_email;
    const citySlug = session.client_reference_id; // We passed the city here

    console.log(`Payment successful for ${customerEmail} - City: ${citySlug}`);

    // Send this data to Airtable so an Airtable Automation can email the user
    try {
      await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Purchases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              Email: customerEmail,
              City: citySlug || 'Unknown',
              Status: 'Paid',
              StripeSessionId: session.id,
              Amount: session.amount_total / 100
            }
          }]
        })
      });
      console.log('Successfully recorded purchase in Airtable.');
    } catch (airtableErr) {
      console.error('Failed to log purchase to Airtable:', airtableErr);
    }
  }

  res.status(200).json({ received: true });
}

// Helper function to read the raw body from Vercel's req stream
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Disable Next.js / Vercel body parsing so we can read the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
