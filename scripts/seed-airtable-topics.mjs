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

// ─── TOPICS NEEDING CONTENT ─────────────────────────────────────────────────
// These are stub/placeholder comparison posts that need full CMO-generated content.
// Each entry maps to an existing blog file marked draft: true with generic body text.
const TOPICS = [
  {
    topic: "Buenos Aires vs Medellín for Digital Nomads (2026)",
    slug: "buenos-aires-vs-medellin-digital-nomads-2026",
    notes: "South American capitals of remote work. Compare the blue dollar rate vs $1,400 monthly in Medellin. Territorial taxation vs complex tax systems. Visas and timezone benefits."
  },
  {
    topic: "Da Nang vs Chiang Mai for Digital Nomads (2026)",
    slug: "da-nang-vs-chiang-mai-digital-nomads-2026",
    notes: "Southeast Asia low-cost showdown. Beach vs Mountains. Both under $1,200/mo. Compare Vietnam's new e-visa to Thailand's DTV visa."
  },
  {
    topic: "Madeira vs Lisbon for Digital Nomads (2026)",
    slug: "madeira-vs-lisbon-digital-nomads-2026",
    notes: "Portugal island vs mainland. NHR 2.0 implications. Lower cost of living in Madeira ($1,500/mo) vs Lisbon ($2,400/mo). Digital Nomad Village community."
  },
  {
    topic: "Bangkok vs Dubai for Digital Nomads (2026)",
    slug: "bangkok-vs-dubai-digital-nomads-2026",
    notes: "Big city hubs. Thailand DTV visa vs Dubai remote work visa. Cost difference ($1,500 vs $3,500). 0% tax vs territorial tax."
  },
  {
    topic: "Ho Chi Minh City vs Bangkok for Digital Nomads (2026)",
    slug: "hcmc-vs-bangkok-digital-nomads-2026",
    notes: "Bustling SE Asia metropolises. Cost of living comparison ($1,100 vs $1,500). Coworking spaces, coffee culture, and visa longevity."
  }
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
  console.log('║   🌱 AIRTABLE TOPIC SEEDER — Stub Post Queue               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env');
    process.exit(1);
  }

  const formatted = TOPICS.map(t => ({
    fields: {
      'Topic': t.topic,
      'Status': 'Needs Draft',
    },
  }));

  console.log(`\n📋 Seeding ${formatted.length} stub topics into "${TABLE_NAME}"...\n`);

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
