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
  // 🌍 Stub Comparison Posts — need full data-driven rewrites
  {
    topic: "Bali vs Medellín for Digital Nomads (2026)",
    slug: "bali-vs-medellin-digital-nomads-2026",
    notes: "Compare cost of living ($1,800 vs $1,400), tax rates (0% E33G vs territorial), visa options, coworking scenes. Existing stub has generic placeholder text.",
  },
  {
    topic: "Chiang Mai vs Dubai for Digital Nomads (2026)",
    slug: "chiang-mai-vs-dubai-digital-nomads-2026",
    notes: "Compare $1,100 vs $3,500 monthly costs, 0% tax both cities, LTR vs freelance visa, coworking quality gap. Existing stub has generic placeholder text.",
  },
  {
    topic: "Dubai vs Lisbon for Digital Nomads (2026)",
    slug: "dubai-vs-lisbon-digital-nomads-2026",
    notes: "0% vs 20% NHR tax, $3,500 vs $2,400 monthly, visa pathways. Duplicate slug exists (dubai-vs-lisbon-tax-comparison) — this one needs its own angle. Existing stub has generic placeholder text.",
  },
  {
    topic: "Dubai vs Singapore for Digital Nomads (2026)",
    slug: "dubai-vs-singapore-digital-nomads-2026",
    notes: "Two 0% tax hubs compared. $3,500 vs $4,200 monthly. Freezone vs EP visa. Existing stub has generic placeholder text. Longer-form version exists at separate slug.",
  },
  {
    topic: "Lisbon vs Barcelona for Digital Nomads (2026)",
    slug: "lisbon-vs-barcelona-digital-nomads-2026",
    notes: "NHR 2.0 vs Beckham Law, $2,400 vs $2,800 monthly, D7 vs Beckham visa. Existing stub has generic placeholder text.",
  },
  {
    topic: "Lisbon vs Valencia for Digital Nomads (2026)",
    slug: "lisbon-vs-valencia-digital-nomads-2026",
    notes: "Portugal NHR vs Spain Beckham Law angle, $2,400 vs $2,200 monthly, coworking scenes. Existing stub has generic placeholder text.",
  },
  {
    topic: "Medellín vs Mexico City for Digital Nomads (2026)",
    slug: "medellin-vs-mexico-city-digital-nomads-2026",
    notes: "Latin America heavyweight comparison. $1,400 vs $1,600 monthly, territorial tax, digital nomad visa vs tourist visa overstay risk. Existing stub has generic placeholder text.",
  },
  {
    topic: "Porto vs Valencia for Digital Nomads (2026)",
    slug: "porto-vs-valencia-digital-nomads-2026",
    notes: "Iberian Peninsula comparison. NHR vs Beckham Law, $1,800 vs $2,200 monthly, slower pace cities. Existing stub has generic placeholder text.",
  },
  {
    topic: "Tbilisi vs Chiang Mai for Digital Nomads (2026)",
    slug: "tbilisi-vs-chiang-mai-digital-nomads-2026",
    notes: "Budget nomad showdown. 1% small business tax vs 0% foreign income, $1,200 vs $1,100 monthly. Existing stub has generic placeholder text.",
  },
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
