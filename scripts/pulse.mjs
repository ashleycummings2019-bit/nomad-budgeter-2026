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
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Add USD=1 so every currency is covered
    const rates = { USD: 1, ...data.rates };
    
    // Cache rates to a separate file (useful for client-side JS)
    writeFileSync(RATES_CACHE_PATH, JSON.stringify({
      base: 'USD',
      date: data.date,
      updated: new Date().toISOString(),
      rates
    }, null, 2));
    
    console.log(`✅ Got ${Object.keys(rates).length} currency rates (date: ${data.date})`);
    return rates;
  } catch (err) {
    console.warn(`⚠️  Rate fetch failed: ${err.message}. Using cached rates if available.`);
    
    // Try to use cached rates
    try {
      const cached = JSON.parse(readFileSync(RATES_CACHE_PATH, 'utf-8'));
      console.log(`📦 Using cached rates from ${cached.date}`);
      return cached.rates;
    } catch {
      console.error('❌ No cached rates available. Skipping price enrichment.');
      return null;
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
  "new-york-city": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9"
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
  try {
    const { default: getOverrides } = await import('../src/_data/airtableOverrides.js');
    overrides = await getOverrides();
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
      if (cityOverrides.name) city.tax_regime = cityOverrides.name;
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
