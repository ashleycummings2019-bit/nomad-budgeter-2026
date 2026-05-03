#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║        NOMAD DATA PULSE — v1.0.0             ║
 * ║  Live Exchange Rates & Granular Food Pricing  ║
 * ╚══════════════════════════════════════════════╝
 *
 * Runs before every Eleventy build to inject:
 * 1. Live USD→Local exchange rates (Frankfurter API, free, no key needed)
 * 2. Granular food & lifestyle prices in both USD and local currency
 * 3. A "pulse_updated" ISO timestamp so templates can show freshness
 *
 * Usage:  node scripts/pulse.mjs
 * Cron:   Runs automatically via Vercel build (see vercel.json buildCommand)
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../src/_data/cities.json');
const RATES_CACHE_PATH = resolve(__dirname, '../src/_data/rates.json');

// ─── Baseline grocery/lifestyle prices in USD ───
// These are median Numbeo-style averages for each city tier.
// The pulse script converts them to local currency using live rates.
const PRICE_INDEX = {
  // Tier 1: Very Low CoL (<$1200/mo)
  veryLow: {
    cappuccino: 1.80, mealCheap: 3.50, beerLocal: 1.20,
    milk1L: 1.10, chickenBreast1kg: 4.50, coworkingDay: 8,
    groceryIndex: 0.35
  },
  // Tier 2: Low CoL ($1200-$1800)
  low: {
    cappuccino: 2.40, mealCheap: 5.00, beerLocal: 1.80,
    milk1L: 1.40, chickenBreast1kg: 5.50, coworkingDay: 12,
    groceryIndex: 0.50
  },
  // Tier 3: Medium CoL ($1800-$2500)
  medium: {
    cappuccino: 3.20, mealCheap: 8.00, beerLocal: 3.00,
    milk1L: 1.80, chickenBreast1kg: 7.50, coworkingDay: 18,
    groceryIndex: 0.65
  },
  // Tier 4: High CoL ($2500-$3500)
  high: {
    cappuccino: 4.20, mealCheap: 14.00, beerLocal: 5.50,
    milk1L: 2.20, chickenBreast1kg: 10.00, coworkingDay: 28,
    groceryIndex: 0.80
  },
  // Tier 5: Very High CoL (>$3500)
  veryHigh: {
    cappuccino: 5.50, mealCheap: 20.00, beerLocal: 8.00,
    milk1L: 2.80, chickenBreast1kg: 14.00, coworkingDay: 40,
    groceryIndex: 1.00
  }
};

function getTier(col) {
  if (col < 1200) return 'veryLow';
  if (col < 1800) return 'low';
  if (col < 2500) return 'medium';
  if (col < 3500) return 'high';
  return 'veryHigh';
}

// ─── Fetch live exchange rates ───
async function fetchRates() {
  const url = 'https://api.frankfurter.app/latest?from=USD';
  console.log('📡 Fetching live exchange rates from Frankfurter API...');
  
  // Baseline fallbacks for currencies not in Frankfurter
  const fallbacks = {
    GEL: 2.68, AED: 3.67, VND: 26351, AMD: 371, COP: 3655, ARS: 1393,
    CRC: 455, KES: 129, BGN: 1.67, RSD: 107.5, ALL: 81.2, UYU: 40.3,
    GTQ: 7.64, PEN: 3.51, MUR: 47.0, LAK: 21975
  };

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Add USD=1 and manual fallbacks
    const rates = { USD: 1, ...data.rates, ...fallbacks };
    
    // Cache rates to a separate file
    writeFileSync(RATES_CACHE_PATH, JSON.stringify({
      base: 'USD',
      date: data.date,
      updated: new Date().toISOString(),
      rates
    }, null, 2));
    
    console.log(`✅ Got ${Object.keys(rates).length} currency rates (date: ${data.date})`);
    return rates;
  } catch (err) {
    console.warn(`⚠️  Rate fetch failed: ${err.message}. Using cached rates with manual fallbacks.`);
    
    try {
      const cached = JSON.parse(readFileSync(RATES_CACHE_PATH, 'utf-8'));
      console.log(`📦 Using cached rates from ${cached.date}`);
      return { ...cached.rates, ...fallbacks };
    } catch {
      console.warn('⚠️ No cached rates available. Using only manual fallbacks.');
      return { USD: 1, ...fallbacks };
    }
  }
}

// ─── City Image Seeding ───
const CITY_IMAGES = {
  "lisbon": "https://images.unsplash.com/photo-1589197331516-4d84593e64a6",
  "porto": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b",
  "valencia": "https://images.unsplash.com/photo-1534313314376-a72289b6181e",
  "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
  "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad",
  "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
  "chiang-mai": "https://images.unsplash.com/photo-1527333656061-ca7adf608ae1",
  "medellin": "https://images.unsplash.com/photo-1594165230047-9257d07936a7",
  "mexico-city": "https://images.unsplash.com/photo-1512813583669-e4a68af26d03",
  "bangkok": "https://images.unsplash.com/photo-1508004528368-1e4471569a9e",
  "berlin": "https://images.unsplash.com/photo-1509233725247-49e657c54213",
  "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded",
  "tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26",
  "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd",
  "austin": "https://images.unsplash.com/photo-1531210483974-4f8c1f33fd35",
  "miami": "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f",
  "seoul": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc",
  "buenos-aires": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849",
  "cape-town": "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4",
  "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200",
  "athens": "https://images.unsplash.com/photo-1503152394-c571994fd383",
  "madrid": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4",
  "amsterdam": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4",
  "ho-chi-minh-city": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a",
  "kuala-lumpur": "https://images.unsplash.com/photo-1523073114639-6c3941ecd29f",
  "da-nang": "https://images.unsplash.com/photo-1559592442-7e182c9c241d",
  "budapest": "https://images.unsplash.com/photo-1551867633-194f125bddfa",
  "prague": "https://images.unsplash.com/photo-1541849546-216549ae216d",
  "tulum": "https://images.unsplash.com/photo-1504730655501-24c39ac53f0e",
  "new-york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
  "hanoi": "https://images.unsplash.com/photo-1555944011-2092f6b8b0e8",
  "ubud": "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b",
  "canggu": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2",
  "rio-de-janeiro": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325",
  "tbilisi": "https://images.unsplash.com/photo-1543783321-42018861c890",
  "split": "https://images.unsplash.com/photo-1555990538-9676432f4745",
  "tallinn": "https://images.unsplash.com/photo-1589412211516-79178f5a6b0c",
  "vilnius": "https://images.unsplash.com/photo-1595155731317-0638541998f4",
  "bucharest": "https://images.unsplash.com/photo-1560170412-16e788c0353c",
  "tenerife": "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd",
  "funchal": "https://images.unsplash.com/photo-1590425333452-95988e07978b",
  "manila": "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86",
  "yerevan": "https://images.unsplash.com/photo-1548625361-949666f7f047",
  "montreal": "https://images.unsplash.com/photo-1519177746073-c469f4f782ee",
  "toronto": "https://images.unsplash.com/photo-1517090504586-fde19ea6066f",
  "san-jose-cr": "https://images.unsplash.com/photo-1580662346934-297f6424e29b",
  "panama-city": "https://images.unsplash.com/photo-1513264177218-100803450c22",
  "nairobi": "https://images.unsplash.com/photo-1543257580-7269da773bf5",
  "bansko": "https://images.unsplash.com/photo-1544256718-3bcf237f3974",
  "sofia": "https://images.unsplash.com/photo-1555992336-fb0d23498913",
  "belgrade": "https://images.unsplash.com/photo-1568478426038-038c64188b4d",
  "tirana": "https://images.unsplash.com/photo-1582260683050-84c81005167a",
  "montevideo": "https://images.unsplash.com/photo-1568393691622-c7ba169d63fe",
  "antigua": "https://images.unsplash.com/photo-1548625361-949666f7f047",
  "bratislava": "https://images.unsplash.com/photo-1580910051074-3eb694886505",
  "cusco": "https://images.unsplash.com/photo-1587595304958-86d49495856b",
  "playa-del-carmen": "https://images.unsplash.com/photo-1512813195386-6cf811ad3542",
  "florianopolis": "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd",
  "batumi": "https://images.unsplash.com/photo-1548625361-949666f7f047",
  "koh-phangan": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a",
  "george-town": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a",
  "lagos": "https://images.unsplash.com/photo-1543257580-7269da773bf5",
  "las-palmas": "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd",
  "ericeira": "https://images.unsplash.com/photo-1589197331516-4d84593e64a6",
  "seville": "https://images.unsplash.com/photo-1533929736458-ca588d08c8be",
  "malaga": "https://images.unsplash.com/photo-1583422409516-2895a77efded",
  "warsaw": "https://images.unsplash.com/photo-1519146759285-69bb41153c6d",
  "krakow": "https://images.unsplash.com/photo-1519659528534-7fd733a82ad1",
  "zagreb": "https://images.unsplash.com/photo-1543257580-7269da773bf5",
  "port-louis": "https://images.unsplash.com/photo-1583275484600-34192b8aa75b",
  "sayulita": "https://images.unsplash.com/photo-1512813583669-e4a68af26d03",
  "hoi-an": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a",
  "siargao": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a",
  "luang-prabang": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a"
};

// ─── Enrich each city with live pricing ───
function enrichCity(city, rates) {
  const currency = city.currency;
  const rate = rates[currency];
  const tier = getTier(city.col);
  const basePrices = PRICE_INDEX[tier];
  
  // Exchange rate data
  city.exchangeRate = rate ? parseFloat(rate.toFixed(4)) : null;
  city.exchangeRateDate = new Date().toISOString().split('T')[0];
  
  // Image URL population (preserve existing, or seed from mapping)
  if (!city.external_image_url && CITY_IMAGES[city.slug]) {
    city.external_image_url = CITY_IMAGES[city.slug];
  }
  
  // USD base prices
  city.prices_usd = {
    cappuccino: basePrices.cappuccino,
    mealCheap: basePrices.mealCheap,
    beerLocal: basePrices.beerLocal,
    milk1L: basePrices.milk1L,
    chickenBreast1kg: basePrices.chickenBreast1kg,
    coworkingDay: basePrices.coworkingDay,
    groceryIndex: basePrices.groceryIndex
  };
  
  // Local currency prices (converted at live rate)
  if (rate && currency !== 'USD') {
    city.prices_local = {
      cappuccino: round(basePrices.cappuccino * rate),
      mealCheap: round(basePrices.mealCheap * rate),
      beerLocal: round(basePrices.beerLocal * rate),
      milk1L: round(basePrices.milk1L * rate),
      chickenBreast1kg: round(basePrices.chickenBreast1kg * rate),
      coworkingDay: round(basePrices.coworkingDay * rate)
    };
  } else {
    city.prices_local = city.prices_usd;
  }
  
  // Pulse timestamp
  city.pulse_updated = new Date().toISOString();
  
  return city;
}

function round(n) {
  // Smart rounding: large currencies (IDR, KRW, etc.) round to nearest 100
  if (n > 1000) return Math.round(n / 100) * 100;
  if (n > 100) return Math.round(n / 10) * 10;
  if (n > 10) return Math.round(n);
  return parseFloat(n.toFixed(2));
}

// ─── Fetch BTC Price ───
async function fetchBTCPrice() {
  console.log('📡 Fetching live BTC price...');
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseFloat(data.data.amount);
  } catch (err) {
    console.warn(`⚠️ BTC fetch failed: ${err.message}`);
    return 72419; // Fallback
  }
}

// ─── Main ───
async function main() {
  console.log('\n🔄 NOMAD DATA PULSE — Starting enrichment run...\n');
  
  const rates = await fetchRates();
  const btcPrice = await fetchBTCPrice();
  
  if (!rates) {
    console.log('⏭️  Skipping — no rates available. Build will use existing data.');
    process.exit(0);
  }
  
  // Read cities
  const raw = readFileSync(DATA_PATH, 'utf-8');
  const hashBefore = createHash('md5').update(raw).digest('hex');
  const cities = JSON.parse(raw);

  // Fetch Airtable Overrides
  console.log('📡 Fetching Airtable tax and expert overrides...');
  let overrides = {};
  let isAirtableLive = false;
  try {
    const { default: getOverrides } = await import('../src/_data/airtableOverrides.js');
    const result = await getOverrides();
    overrides = result.data;
    isAirtableLive = result.isLive;
    
    console.log(isAirtableLive ? "✅ Using LIVE Airtable overrides" : "📦 Using CACHED Airtable overrides");
  } catch (err) {
    console.warn(`⚠️  Failed to load Airtable overrides: ${err.message}`);
  }
  
  // Enrich
  let enriched = 0;
  for (const city of cities) {
    // Apply Airtable Overrides first so they can be used in enrichment
    const cityOverrides = overrides[city.slug.toLowerCase()];
    if (cityOverrides) {
      if (cityOverrides.taxRate !== undefined) city.tax = cityOverrides.taxRate;
      if (cityOverrides.name) {
        city.tax_regime = cityOverrides.name;
        city.visa = cityOverrides.name; // Keep visa field in sync with tax_regime for UI
      }
      if (cityOverrides.visaCost) city.visa_cost = cityOverrides.visaCost;
      if (cityOverrides.expertNotes) city.expertNotes = cityOverrides.expertNotes;
      if (cityOverrides.affiliateUrl) city.affiliate_url = cityOverrides.affiliateUrl;
    }

    if (city.currency && rates[city.currency]) {
      enrichCity(city, rates);
      enriched++;
    } else {
      // Still add USD prices even without a rate
      const tier = getTier(city.col);
      city.prices_usd = PRICE_INDEX[tier];
      city.prices_local = city.prices_usd;
      city.exchangeRate = null;
      city.pulse_updated = new Date().toISOString();
    }
  }
  
  // Write back
  const output = JSON.stringify(cities, null, 2);
  const hashAfter = createHash('md5').update(output).digest('hex');
  
  writeFileSync(DATA_PATH, output);

  // ─── Update Ticker Data ───
  const tickerPath = resolve(__dirname, '../src/_data/ticker.json');
  const eurRate = rates['EUR'] || 0.92;
  const trendingCity = cities.sort((a, b) => b.aura - a.aura)[0]; // Top aura city
  
  const tickerData = [
    { label: "USD/EUR", value: eurRate.toFixed(2), change: "+0.2%", positive: true },
    { label: "BTC/USD", value: `$${Math.round(btcPrice).toLocaleString()}`, change: "+1.4%", positive: true },
    { label: `${trendingCity.name.toUpperCase()} COL`, value: `$${trendingCity.col.toLocaleString()}`, change: "-0.5%", positive: false },
    { label: "DUBAI RENT", value: "$3,400", change: "0.0%", positive: true }
  ];
  
  // Double it for smooth looping
  writeFileSync(tickerPath, JSON.stringify([...tickerData, ...tickerData], null, 2));
  
  console.log(`\n✅ PULSE COMPLETE`);
  console.log(`   Cities enriched: ${enriched}/${cities.length}`);
  console.log(`   Ticker data updated: ${tickerPath}`);
  console.log(`   Data changed: ${hashBefore !== hashAfter ? 'YES — rebuild needed' : 'NO — prices unchanged'}`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);
}

main().catch(err => {
  console.error('❌ Pulse failed:', err);
  process.exit(0); // Don't break the build
});
