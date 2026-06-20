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
// 60 high-value "City vs City" comparison topics selected for maximum SEO coverage.
// Each pairs two cities from the 77-city database to target real search queries.
// Strategy: mix zero-tax vs high-tax, same-region rivals, and cross-continent showdowns.
const TOPICS = [
  // ── EUROPE INTERNAL ────────────────────────────────────────────────────────
  { topic: "Lisbon vs Barcelona for Digital Nomads (2026)", notes: "Portugal NHR vs Spain Beckham Law. $2,400 vs $2,800 COL." },
  { topic: "Athens vs Split for Digital Nomads (2026)", notes: "Greece 7% flat vs Croatia 0%. Mediterranean showdown." },
  { topic: "Budapest vs Bucharest for Digital Nomads (2026)", notes: "Central/Eastern Europe budget kings. 15% vs 10% flat tax." },
  { topic: "Tallinn vs Vilnius for Digital Nomads (2026)", notes: "Baltic tech hubs. e-Residency vs DNV." },
  { topic: "Berlin vs Amsterdam for Digital Nomads (2026)", notes: "Western EU creative capitals. Freelance visa vs DAFT." },
  { topic: "Prague vs Warsaw for Digital Nomads (2026)", notes: "Central Europe: Trade License vs Polish flat tax." },
  { topic: "Bansko vs Sofia for Digital Nomads (2026)", notes: "Bulgaria ski town vs capital. Coworking culture." },
  { topic: "Belgrade vs Tirana for Digital Nomads (2026)", notes: "Balkans rising stars. Ultra-low COL comparison." },
  { topic: "Valencia vs Malaga for Digital Nomads (2026)", notes: "Spain's coastal nomad hubs. Same tax, different vibes." },
  { topic: "Lisbon vs Athens for Digital Nomads (2026)", notes: "20% NHR vs 7% flat. EU Schengen showdown." },
  { topic: "Seville vs Las Palmas for Digital Nomads (2026)", notes: "Spanish mainland vs Canary Islands lifestyle." },
  { topic: "Krakow vs Budapest for Digital Nomads (2026)", notes: "Central Europe budget showdown." },
  { topic: "Porto vs Funchal for Digital Nomads (2026)", notes: "Portugal mainland vs Madeira island life." },
  { topic: "Tenerife vs Split for Digital Nomads (2026)", notes: "Island vs Adriatic coast. Beckham Law vs 0% DNV." },
  { topic: "Bratislava vs Prague for Digital Nomads (2026)", notes: "Sister cities, different tax systems." },

  // ── SOUTHEAST ASIA INTERNAL ────────────────────────────────────────────────
  { topic: "Bali vs Da Nang for Digital Nomads (2026)", notes: "Indonesia E33G vs Vietnam e-visa. Beach nomad showdown." },
  { topic: "Chiang Mai vs Ho Chi Minh City for Digital Nomads (2026)", notes: "Mountain calm vs city energy. Thailand DTV vs Vietnam." },
  { topic: "Kuala Lumpur vs Bangkok for Digital Nomads (2026)", notes: "Malaysia DE Rantau vs Thailand DTV." },
  { topic: "Koh Phangan vs Canggu for Digital Nomads (2026)", notes: "Thai island vs Bali surf town. Budget paradise fight." },
  { topic: "George Town vs Chiang Mai for Digital Nomads (2026)", notes: "Malaysia Penang vs Thailand north. Both under $1,200/mo." },
  { topic: "Ubud vs Hoi An for Digital Nomads (2026)", notes: "Bali culture vs Vietnam charm. Ultra-cheap living." },
  { topic: "Manila vs Ho Chi Minh City for Digital Nomads (2026)", notes: "Philippines SRRV vs Vietnam. English advantage." },
  { topic: "Hanoi vs Da Nang for Digital Nomads (2026)", notes: "Vietnam capital vs beach city." },
  { topic: "Singapore vs Kuala Lumpur for Digital Nomads (2026)", notes: "City-state premium vs Malaysia value." },

  // ── AMERICAS INTERNAL ──────────────────────────────────────────────────────
  { topic: "Mexico City vs Medellín for Digital Nomads (2026)", notes: "Latin America's biggest nomad hubs. Timezone advantage." },
  { topic: "Tulum vs Playa del Carmen for Digital Nomads (2026)", notes: "Mexican Riviera neighbours. Beach vs town." },
  { topic: "Buenos Aires vs Montevideo for Digital Nomads (2026)", notes: "River Plate rivals. Argentina chaos vs Uruguay stability." },
  { topic: "Panama City vs San José for Digital Nomads (2026)", notes: "Central America territorial tax havens." },
  { topic: "Austin vs Miami for Digital Nomads (2026)", notes: "US domestic: Texas 0% state tax vs Florida lifestyle." },
  { topic: "Mexico City vs Buenos Aires for Digital Nomads (2026)", notes: "LATAM megacities. Peso arbitrage on both sides." },
  { topic: "Cusco vs Antigua for Digital Nomads (2026)", notes: "Peru highlands vs Guatemala colonial town." },
  { topic: "Montreal vs Toronto for Digital Nomads (2026)", notes: "Canadian hub showdown. French vs English, tax differences." },

  // ── CROSS-CONTINENT SHOWDOWNS ──────────────────────────────────────────────
  { topic: "Dubai vs Singapore for Digital Nomads (2026)", notes: "0% income tax vs territorial. Premium city-states." },
  { topic: "Lisbon vs Bali for Digital Nomads (2026)", notes: "Europe vs Asia lifestyle. 20% NHR vs 0% E33G." },
  { topic: "Bangkok vs Medellín for Digital Nomads (2026)", notes: "Asia vs LATAM. $1,500 vs $1,400 monthly." },
  { topic: "Tbilisi vs Chiang Mai for Digital Nomads (2026)", notes: "1% micro-biz vs Thailand DTV. Ultimate budget fight." },
  { topic: "Dubai vs Lisbon for Digital Nomads (2026)", notes: "0% tax luxury vs 20% NHR European charm." },
  { topic: "Berlin vs Mexico City for Digital Nomads (2026)", notes: "Europe vs LATAM. Freelance visa vs temp resident." },
  { topic: "Cape Town vs Bali for Digital Nomads (2026)", notes: "Africa vs Asia. Adventure meets tropical paradise." },
  { topic: "Tokyo vs Seoul for Digital Nomads (2026)", notes: "East Asian tech capitals. Startup visa vs D-8 DNV." },
  { topic: "Istanbul vs Bangkok for Digital Nomads (2026)", notes: "Eurasia crossroads vs SE Asia hub." },
  { topic: "Nairobi vs Cape Town for Digital Nomads (2026)", notes: "Africa's two biggest nomad cities compared." },
  { topic: "Batumi vs Tbilisi for Digital Nomads (2026)", notes: "Georgia coast vs capital. Same 1% tax, different vibes." },

  // ── ZERO-TAX DEEP DIVES ────────────────────────────────────────────────────
  { topic: "Dubai vs Panama City for Digital Nomads (2026)", notes: "0% tax showdown. Middle East vs Central America." },
  { topic: "Bali vs Split for Digital Nomads (2026)", notes: "Both 0% on foreign income. Tropical vs Mediterranean." },
  { topic: "Malaysia vs Panama for Digital Nomads (2026)", notes: "Territorial tax havens with DNV programs." },

  // ── PREMIUM vs BUDGET ──────────────────────────────────────────────────────
  { topic: "London vs Tbilisi for Digital Nomads (2026)", notes: "UK 20%+ tax vs Georgia 1%. $3,800 vs $1,200 COL." },
  { topic: "Amsterdam vs Budapest for Digital Nomads (2026)", notes: "Western premium vs Eastern value. 5x rent difference." },
  { topic: "New York vs Mexico City for Digital Nomads (2026)", notes: "US taxes vs Mexico arbitrage. The escape plan." },
  { topic: "Singapore vs Bangkok for Digital Nomads (2026)", notes: "Premium vs budget in Asia. 3x cost difference." },

  // ── ISLAND & LIFESTYLE ─────────────────────────────────────────────────────
  { topic: "Funchal vs Tenerife for Digital Nomads (2026)", notes: "Atlantic islands: Madeira vs Canaries." },
  { topic: "Siargao vs Koh Phangan for Digital Nomads (2026)", notes: "Philippines surf vs Thai full moon. Island nomad life." },
  { topic: "Sliema vs Paphos for Digital Nomads (2026)", notes: "Malta vs Cyprus. EU island tax regimes." },

  // ── EAST ASIA & SPECIAL ────────────────────────────────────────────────────
  { topic: "Tokyo vs Dubai for Digital Nomads (2026)", notes: "Japan visa path vs 0% Dubai. Culture vs savings." },
  { topic: "Seoul vs Taipei for Digital Nomads (2026)", notes: "K-Wave vs tech island. D-8 vs Gold Card." },
  { topic: "Andorra la Vella vs Monaco for Digital Nomads (2026)", notes: "Europe's micro-state tax havens compared." },

  // ── GUIDE-STYLE (High Search Volume) ───────────────────────────────────────
  { topic: "Best 0% Tax Cities for Digital Nomads in 2026", notes: "Roundup of Dubai, Bali, Split, Panama, Malaysia, Costa Rica." },
  { topic: "Cheapest Cities for Digital Nomads Under $1,000 per Month (2026)", notes: "Tbilisi, Chiang Mai, Bucharest, Medellín, Da Nang." },
  { topic: "Best Digital Nomad Visas in Europe for 2026", notes: "Compare Greece, Croatia, Spain, Portugal, Estonia, Hungary DNVs." },
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
