/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🌱 AIRTABLE TOPIC SEEDER — TIER 2 Expansion Batch        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Pushes Tier 2 high-converting topics into the Airtable "Content Pipeline".
 * These target untapped keyword clusters beyond city-vs-city comparisons:
 *   - "Best cities for [profession]" (high search volume)
 *   - "Cost of living in [city] for digital nomads" (mid-funnel)
 *   - Country tax deep-dives (high-intent, bottom-funnel)
 *   - "How to set up as a freelancer in [country]" (action-oriented)
 *
 * Usage:  node --env-file=.env scripts/seed-airtable-tier2.mjs
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Content Pipeline';

const TOPICS = [
  // ── BEST CITIES FOR [PROFESSION] (High Volume Pillar Pages) ──────────────
  { topic: "Best Cities for Software Engineers to Live Abroad in 2026", notes: "Target devs earning $80-150k. Rank by COL, tax, internet, community." },
  { topic: "Best Cities for Freelance Designers and Creatives in 2026", notes: "Bali, Lisbon, Berlin, CDMX, Medellín. Design community focus." },
  { topic: "Best Cities for Remote Startup Founders in 2026", notes: "Dubai, Tallinn, Lisbon, Singapore. Startup visa + 0% tax combos." },
  { topic: "Best Cities for Digital Nomad Families in 2026", notes: "Safety, healthcare, schools. Chiang Mai, Lisbon, KL, Valencia." },
  { topic: "Best Cities for Women Solo Digital Nomads in 2026", notes: "Safety index, community, healthcare access. High search volume." },
  { topic: "Best Cities for Content Creators and YouTubers in 2026", notes: "Internet speed, scenery, cost, tax on ad revenue." },
  { topic: "Best European Cities for Remote Workers Earning in USD in 2026", notes: "Currency arbitrage. Lisbon, Budapest, Tbilisi, Athens, Split." },
  { topic: "Best Asian Cities for Remote Workers Earning in USD in 2026", notes: "Bali, Chiang Mai, KL, Da Nang, HCMC. Massive purchasing power." },

  // ── COST OF LIVING DEEP DIVES (Mid-Funnel, City-Specific) ────────────────
  { topic: "Cost of Living in Lisbon as a Digital Nomad (2026 Breakdown)", notes: "Rent, food, coworking, transport. Monthly budget template." },
  { topic: "Cost of Living in Bali as a Digital Nomad (2026 Breakdown)", notes: "Canggu vs Ubud. Visa costs, health insurance, scooter rental." },
  { topic: "Cost of Living in Medellín as a Digital Nomad (2026 Breakdown)", notes: "El Poblado vs Laureles. Safety, visa, monthly budget." },
  { topic: "Cost of Living in Chiang Mai as a Digital Nomad (2026 Breakdown)", notes: "Old City vs Nimman. Cheapest nomad hub in the world?" },
  { topic: "Cost of Living in Dubai as a Digital Nomad (2026 Breakdown)", notes: "0% tax but high COL. Is it worth it? Budget analysis." },
  { topic: "Cost of Living in Mexico City as a Digital Nomad (2026 Breakdown)", notes: "Roma Norte vs Condesa. Street food budget vs restaurant life." },
  { topic: "Cost of Living in Bangkok as a Digital Nomad (2026 Breakdown)", notes: "Sukhumvit vs On Nut. New DTV visa costs factored in." },
  { topic: "Cost of Living in Tbilisi as a Digital Nomad (2026 Breakdown)", notes: "Europe's cheapest capital? 1% tax + $800/mo budget." },
  { topic: "Cost of Living in Budapest as a Digital Nomad (2026 Breakdown)", notes: "District VII vs District V. Thermal baths and forint value." },
  { topic: "Cost of Living in Buenos Aires as a Digital Nomad (2026 Breakdown)", notes: "Blue dollar rate impact. Palermo vs San Telmo budgets." },

  // ── COUNTRY TAX DEEP DIVES (Bottom-Funnel, High Intent) ──────────────────
  { topic: "Georgia Tax Guide for Digital Nomads (2026): The 1% Micro-Business Path", notes: "Full walkthrough of the micro-business registration in Tbilisi." },
  { topic: "Croatia Digital Nomad Visa Tax Guide (2026): How to Pay 0% Legally", notes: "DNV exemption explained. Split, Zagreb, Dubrovnik." },
  { topic: "Malaysia DE Rantau Visa Complete Guide (2026): Tax, Cost, Application", notes: "Full walkthrough for KL and Penang. Territorial tax system." },
  { topic: "UAE Freelancer Visa Tax Guide (2026): How Dubai's 0% Tax Actually Works", notes: "Free zone vs mainland. GOFRUGAL vs Fujairah setup." },
  { topic: "Paraguay Tax Residency for Digital Nomads (2026): The Hidden 0% Strategy", notes: "Territorial tax + easy residency. Asunción cost analysis." },
  { topic: "Estonia e-Residency for Digital Nomads (2026): Is It Still Worth It?", notes: "e-Residency vs actual tax residency. Common misconceptions." },
  { topic: "Indonesia E33G Visa Deep Dive (2026): Bali's Golden Ticket for Nomads", notes: "Application process, tax implications, renewal strategy." },
  { topic: "Greece 7% Flat Tax for Digital Nomads (2026): Complete Application Guide", notes: "Non-dom regime. Athens and island life on a flat rate." },
  { topic: "Costa Rica Digital Nomad Visa (2026): Tax Benefits and Application", notes: "Territorial tax + new DNV. San José and beach towns." },
  { topic: "Thailand DTV Visa Tax Guide (2026): What the 15% Rule Really Means", notes: "Destination Thailand Visa + new tax rules explained clearly." },

  // ── FREELANCER SETUP GUIDES (Action-Oriented, High Conversion) ───────────
  { topic: "How to Set Up as a Freelancer in Portugal (2026): Tax, Visa, Banking", notes: "NHR 2.0 + D8 visa + Wise/Revolut banking setup." },
  { topic: "How to Set Up as a Freelancer in Spain (2026): Beckham Law Walkthrough", notes: "Autónomo registration + Beckham Law application timeline." },
  { topic: "How to Set Up as a Freelancer in Germany (2026): Freiberufler Guide", notes: "Freelance visa + tax class + health insurance navigation." },
  { topic: "How to Set Up as a Freelancer in Thailand (2026): DTV + Tax Strategy", notes: "DTV application + Thai bank account + tax compliance." },
  { topic: "How to Set Up a US LLC as a Digital Nomad (2026): State-by-State Guide", notes: "Wyoming vs Delaware vs New Mexico. EIN, banking, compliance." },

  // ── MONEY & TOOLS (Affiliate Revenue Drivers) ────────────────────────────
  { topic: "Best Bank Accounts for Digital Nomads in 2026: Wise vs Revolut vs Mercury", notes: "Multi-currency, fees, ATM limits. Affiliate opportunity." },
  { topic: "Best Travel Insurance for Digital Nomads (2026): SafetyWing vs Genki vs World Nomads", notes: "Coverage comparison, cost, claims process. Affiliate." },
  { topic: "Best VPNs for Digital Nomads (2026): Speed, Price, and Privacy Ranked", notes: "NordVPN, Surfshark, ExpressVPN. Affiliate links." },
  { topic: "Best eSIM Plans for Digital Nomads (2026): Saily vs Airalo vs Holafly", notes: "Coverage, data, pricing. Pairs with existing Saily article." },
  { topic: "Best Coworking Spaces for Digital Nomads (2026): City-by-City Guide", notes: "Hubud, Punspace, WeWork, selina. Curated list." },

  // ── ROUNDUPS & LISTICLES (High Search Volume, Shareable) ─────────────────
  { topic: "10 Countries Where Digital Nomads Pay Zero Tax in 2026", notes: "Updated roundup. Dubai, Georgia, Panama, Paraguay, Malaysia, etc." },
  { topic: "The Ultimate Digital Nomad Packing List for 2026", notes: "Tech gear, clothing, documents. Affiliate-heavy." },
  { topic: "12 Mistakes First-Time Digital Nomads Make (And How to Avoid Them)", notes: "Tax, visa, insurance, banking, isolation. Evergreen content." },
  { topic: "How Much Money Do You Need to Be a Digital Nomad in 2026?", notes: "Budget tiers: $1k, $2k, $3k, $5k/mo. City recommendations per tier." },
  { topic: "Digital Nomad Tax Checklist: 7 Things to Do Before You Leave Your Country", notes: "Pre-departure tax compliance. High-intent, bottom-funnel." },
];

// ─── AIRTABLE BATCH CREATE ───────────────────────────────────────────────────
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
  console.log('║   🌱 AIRTABLE TOPIC SEEDER — TIER 2 Expansion              ║');
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

  console.log(`\n📋 Seeding ${formatted.length} TIER 2 topics into "${TABLE_NAME}"...\n`);

  for (let i = 0; i < formatted.length; i += 10) {
    const batch = formatted.slice(i, i + 10);
    console.log(`   ⏳ Pushing batch ${Math.floor(i / 10) + 1} (${batch.length} records)...`);
    const created = await createRecords(batch);
    console.log(`   ✅ Created ${created.length} records`);

    if (i + 10 < formatted.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\n🎉 Done! ${formatted.length} TIER 2 topics seeded with Status = "Needs Draft"`);
  console.log('   → Run "npm run cmo" to generate all content.\n');
}

run().catch(err => {
  console.error('❌ Seeder error:', err.message);
  process.exit(1);
});
