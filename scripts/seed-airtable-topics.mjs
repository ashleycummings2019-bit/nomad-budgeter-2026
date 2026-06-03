/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🌱 AIRTABLE TOPIC SEEDER — Batch load content topics      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Pushes high-converting topics into the Airtable "Content Pipeline"
 * table with Status = "Needs Draft". The CMO script then picks them up.
 *
 * Usage:  node --env-file=.env scripts/seed-airtable-topics.mjs
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Content Pipeline';

// ─── HIGH-CONVERTING TOPICS ──────────────────────────────────────────────────
// Drawn from: Tax Guide, city data, affiliate angles, seasonal hooks
const TOPICS = [
  // 🔥 Tax Arbitrage Hooks (high search intent)
  "The 183-Day Trap: Why Most Digital Nomads Are Still Paying Tax They Don't Owe",
  "Bali's E33G Visa in 2026: How to Pay 0% Tax While Living in Paradise",
  "Spain's Beckham Law vs Portugal's NHR: Which Tax Hack Saves You More in 2026?",
  "Dubai vs Singapore: The Ultimate 0% Tax Showdown for Remote Workers",
  "How I Saved $47,000 in Taxes by Moving to Tbilisi, Georgia (1% Micro-Business Path)",

  // 🌍 City Comparison Engines (drives calculator traffic)
  "Chiang Mai vs Bali: The Real Cost of Living Breakdown for Digital Nomads in 2026",
  "Lisbon vs Medellín: Where Your $3,000/Month Goes Further (With Real Data)",
  "Budapest vs Prague: Europe's Best-Kept Secret for Tax-Optimized Nomads",
  "Mexico City vs Buenos Aires: The Latin America Nomad Cost War",

  // 💰 Affiliate-Driven Content (SafetyWing + Saily)
  "The $42/Month Insurance That Saved My Life in Thailand (Why Every Nomad Needs SafetyWing)",
  "Stop Paying $15/Day for Roaming: How Saily eSIM Cut My Travel Costs by 80%",

  // 📊 Data-Led Authority Pieces
  "The 2026 Digital Nomad Tax Cheat Sheet: 12 Countries Where You Pay 0% Legally",
  "Exit Tax Warning: 5 Countries That Will Tax You for Leaving (And How to Avoid It)",
  "US Citizens Abroad: FEIE vs FBAR vs FATCA — The Complete 2026 Survival Guide",

  // 🚀 Conversion-Focused (Pro Report upsell)
  "Why the $19 Nomad Budgeter Pro Report Pays for Itself in 48 Hours",
];

// ─── AIRTABLE BATCH CREATE ───────────────────────────────────────────────────
// Airtable API accepts max 10 records per request
async function createRecords(records) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airtable create failed (${res.status}): ${errText}`);
  }
  return (await res.json()).records;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🌱 AIRTABLE TOPIC SEEDER                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env');
    process.exit(1);
  }

  const formatted = TOPICS.map(topic => ({
    fields: {
      'Topic': topic,
      'Status': 'Needs Draft',
    },
  }));

  console.log(`\n📋 Seeding ${formatted.length} topics into "${TABLE_NAME}"...\n`);

  // Batch in groups of 10 (Airtable limit)
  for (let i = 0; i < formatted.length; i += 10) {
    const batch = formatted.slice(i, i + 10);
    console.log(`   ⏳ Pushing batch ${Math.floor(i / 10) + 1} (${batch.length} records)...`);
    const created = await createRecords(batch);
    console.log(`   ✅ Created ${created.length} records`);

    // Small delay between batches to respect rate limits
    if (i + 10 < formatted.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\n🎉 Done! ${formatted.length} topics seeded with Status = "Needs Draft"`);
  console.log('   → Run "npm run cmo" to generate all content.\n');
}

run().catch(err => {
  console.error('❌ Seeder error:', err.message);
  process.exit(1);
});
