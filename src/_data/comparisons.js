/**
 * Comparisons Data — Computed from cities.json
 * Generates the featured comparison pairs + auto-generated pairs from top cities.
 */
const cities = require("./cities.json");

module.exports = function () {
  const cityMap = {};
  cities.forEach((c) => {
    cityMap[c.slug] = c;
  });

  // ─── Featured Pairs (The "2026 Global Power List") ───
  const featured = [
    { a: "lisbon", b: "valencia", theme: "EU Tax War", emoji: "🇪🇺", region: "Europe" },
    { a: "bali", b: "chiang-mai", theme: "Budget King", emoji: "🏖️", region: "Southeast Asia" },
    { a: "dubai", b: "singapore", theme: "0% Tax Battle", emoji: "💰", region: "Asia" },
    { a: "medellin", b: "mexico-city", theme: "LATAM Top Pick", emoji: "🌎", region: "Latin America" },
    { a: "split", b: "athens", theme: "Schengen Sun", emoji: "☀️", region: "Europe" },
    { a: "buenos-aires", b: "rio-de-janeiro", theme: "South American Value", emoji: "🌴", region: "South America" },
    { a: "tbilisi", b: "istanbul", theme: "Value Crossroads", emoji: "🌍", region: "Eurasia" },
    { a: "bangkok", b: "ho-chi-minh-city", theme: "City Grind", emoji: "🏙️", region: "Southeast Asia" },
    { a: "budapest", b: "prague", theme: "Central Europe", emoji: "🏰", region: "Europe" },
    { a: "montreal", b: "toronto", theme: "North America", emoji: "🍁", region: "North America" },
    { a: "tallinn", b: "vilnius", theme: "Tech Visa Baltics", emoji: "💻", region: "Europe" },
    { a: "tokyo", b: "seoul", theme: "High-End Asia", emoji: "🗼", region: "East Asia" },
    { a: "tbilisi", b: "yerevan", theme: "Caucasus Hubs", emoji: "⛰️", region: "Caucasus" },
    { a: "san-jose-cr", b: "panama-city", theme: "Eco-Nomad Americas", emoji: "🌿", region: "Central America" },
    { a: "berlin", b: "amsterdam", theme: "Freelance EU", emoji: "🇪🇺", region: "Europe" },
    { a: "tenerife", b: "funchal", theme: "Island Life", emoji: "🏝️", region: "Atlantic Islands" },
    { a: "cape-town", b: "nairobi", theme: "Africa Tech", emoji: "🌍", region: "Africa" },
    { a: "kuala-lumpur", b: "manila", theme: "English-Speaking Asia", emoji: "🗣️", region: "Southeast Asia" },
    { a: "madrid", b: "lisbon", theme: "Iberian Showdown", emoji: "🇪🇸🇵🇹", region: "Europe" },
    { a: "bali", b: "bangkok", theme: "Tropical Titans", emoji: "🌴", region: "Southeast Asia" },
  ];

  const results = [];

  // Build featured comparisons
  featured.forEach((pair) => {
    const cityA = cityMap[pair.a];
    const cityB = cityMap[pair.b];
    if (!cityA || !cityB) return;

    const savingsA100k = Math.round((100000 * (1 - cityA.tax)) / 12 - cityA.col);
    const savingsB100k = Math.round((100000 * (1 - cityB.tax)) / 12 - cityB.col);
    const winner = savingsA100k > savingsB100k ? cityA.name : cityB.name;

    results.push({
      slug: `${pair.a}-vs-${pair.b}`,
      cityA: cityA,
      cityB: cityB,
      theme: pair.theme,
      emoji: pair.emoji,
      region: pair.region,
      featured: true,
      savingsA: savingsA100k,
      savingsB: savingsB100k,
      winner: winner,
      title: `${cityA.name} vs. ${cityB.name}: 2026 Digital Nomad Comparison`,
      description: `Compare cost of living, taxes, and savings potential for digital nomads: ${cityA.name} vs. ${cityB.name}. Which ${pair.region} hub fits your 2026 budget?`,
    });
  });

  // Auto-generate additional pairs from all cities
  const topSlugs = cities.map(c => c.slug);


  const existingSlugs = new Set(results.map((r) => r.slug));

  for (let i = 0; i < topSlugs.length; i++) {
    for (let j = i + 1; j < topSlugs.length; j++) {
      const slugA = topSlugs[i];
      const slugB = topSlugs[j];
      const forwardSlug = `${slugA}-vs-${slugB}`;
      const reverseSlug = `${slugB}-vs-${slugA}`;

      if (existingSlugs.has(forwardSlug) || existingSlugs.has(reverseSlug)) continue;

      const cityA = cityMap[slugA];
      const cityB = cityMap[slugB];
      if (!cityA || !cityB) continue;

      const savingsA = Math.round((100000 * (1 - cityA.tax)) / 12 - cityA.col);
      const savingsB = Math.round((100000 * (1 - cityB.tax)) / 12 - cityB.col);

      results.push({
        slug: forwardSlug,
        cityA: cityA,
        cityB: cityB,
        theme: "Cost of Living",
        emoji: "📊",
        region: cityA.continent === cityB.continent ? cityA.continent : "Global",
        featured: false,
        savingsA: savingsA,
        savingsB: savingsB,
        winner: savingsA > savingsB ? cityA.name : cityB.name,
        title: `${cityA.name} vs. ${cityB.name}: 2026 Digital Nomad Cost of Living Comparison`,
        description: `Compare cost of living, taxes, and savings for digital nomads in ${cityA.name} vs. ${cityB.name}. Updated for 2026.`,
      });

      existingSlugs.add(forwardSlug);
    }
  }

  return results;
};
