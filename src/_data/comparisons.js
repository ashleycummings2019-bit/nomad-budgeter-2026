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
    { a: "da-nang", b: "chiang-mai", theme: "Ultimate Budget", emoji: "🍜", region: "Southeast Asia" },
    { a: "dubai", b: "kuala-lumpur", theme: "0% Tax Strategy", emoji: "🏦", region: "Global" },
    { a: "lisbon", b: "porto", theme: "Portugal Select", emoji: "🇵🇹", region: "Europe" },
    { a: "medellin", b: "buenos-aires", theme: "LatAm Savings", emoji: "💸", region: "Latin America" },
    { a: "athens", b: "valencia", theme: "Mediterranean Value", emoji: "🏛️", region: "Europe" },
    { a: "hanoi", b: "luang-prabang", theme: "Indochina Value", emoji: "🛶", region: "Southeast Asia" },
  ];

  // ─── Priority Hubs (Nomad Popularity) ───
  const priorityHubs = [
    "bali", "canggu", "ubud", "lisbon", "dubai", "medellin", 
    "chiang-mai", "bangkok", "mexico-city", "valencia", 
    "da-nang", "bansko", "austin", "miami", "barcelona",
    "buenos-aires", "istanbul", "tbilisi", "cape-town",
    "athens", "split", "budapest", "funchal", "tenerife", 
    "porto", "tokyo", "singapore", "kuala-lumpur", "tallinn",
    "hanoi"
  ];

  const results = [];

  // Build featured comparisons
  featured.forEach((pair) => {
    const cityA = cityMap[pair.a];
    const cityB = cityMap[pair.b];
    if (!cityA || !cityB) return;

    const savingsA100k = Math.round((100000 * (1 - cityA.tax)) / 12 - cityA.col);
    const savingsB100k = Math.round((100000 * (1 - cityB.tax)) / 12 - cityB.col);
    const arbitrageValue = Math.abs(savingsA100k - savingsB100k);
    const winner = savingsA100k > savingsB100k ? cityA.name : cityB.name;

    results.push({
      slug: `${pair.a}-vs-${pair.b}`,
      cityA: cityA,
      cityB: cityB,
      theme: pair.theme,
      emoji: pair.emoji,
      region: pair.region,
      featured: true,
      priority: 1000, // Highest priority
      savingsA: savingsA100k,
      savingsB: savingsB100k,
      arbitrageValue: arbitrageValue,
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

      // Calculate priority score: 10 for each priority city involved
      let priorityScore = 0;
      if (priorityHubs.includes(slugA)) priorityScore += 10;
      if (priorityHubs.includes(slugB)) priorityScore += 10;
      
      // Bonus for same region (more relevant comparisons)
      if (cityA.continent === cityB.continent) priorityScore += 5;

      const savingsA = Math.round((100000 * (1 - cityA.tax)) / 12 - cityA.col);
      const savingsB = Math.round((100000 * (1 - cityB.tax)) / 12 - cityB.col);
      const arbitrageValue = Math.abs(savingsA - savingsB);

      results.push({
        slug: forwardSlug,
        cityA: cityA,
        cityB: cityB,
        theme: "Cost of Living",
        emoji: "📊",
        region: cityA.continent === cityB.continent ? cityA.continent : "Global",
        featured: false,
        priority: priorityScore,
        savingsA: savingsA,
        savingsB: savingsB,
        arbitrageValue: arbitrageValue,
        winner: savingsA > savingsB ? cityA.name : cityB.name,
        title: `${cityA.name} vs. ${cityB.name}: 2026 Digital Nomad Cost of Living Comparison`,
        description: `Compare cost of living, taxes, and savings for digital nomads in ${cityA.name} vs. ${cityB.name}. Updated for 2026.`,
      });
    }
  }

  // Deduplicate and limit to top 200 most relevant comparisons
  const uniqueResults = [];
  const seenSlugs = new Set();
  
  // Sort by priority first, then alphabetically by slug to ensure deterministic, stable output
  results.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.slug.localeCompare(b.slug);
  });

  for (const res of results) {
    if (!seenSlugs.has(res.slug)) {
      uniqueResults.push(res);
      seenSlugs.add(res.slug);
    }
    if (uniqueResults.length >= 200) break;
  }

  // ─── Themes (Nomad Archetypes) ───
  const themes = [
    {
      id: "zero-tax",
      title: "Zero-to-Low Tax Havens",
      description: "Optimize your savings in 2026's top tax-friendly destinations.",
      slugs: ["dubai-vs-singapore", "dubai-vs-kuala-lumpur", "tallinn-vs-vilnius"],
      emoji: "💰"
    },
    {
      id: "asian-tech",
      title: "Asian Tech Hubs",
      description: "High-speed internet meets high-quality lifestyle.",
      slugs: ["tokyo-vs-seoul", "bangkok-vs-ho-chi-minh-city", "bali-vs-bangkok"],
      emoji: "🗼"
    },
    {
      id: "eu-value",
      title: "European Value Hubs",
      description: "Premium European living without the price tag.",
      slugs: ["lisbon-vs-valencia", "split-vs-athens", "budapest-vs-prague"],
      emoji: "🇪🇺"
    },
    {
      id: "indochina-budget",
      title: "Indochina Budget Havens",
      description: "Maximum financial leverage in Southeast Asia's most soulful cities.",
      slugs: ["hanoi-vs-luang-prabang", "da-nang-vs-chiang-mai", "bangkok-vs-ho-chi-minh-city"],
      emoji: "🛶"
    },
    {
      id: "latam-rising",
      title: "Latin American Rising Stars",
      description: "The fastest growing nomad communities in the Americas.",
      slugs: ["medellin-vs-mexico-city", "buenos-aires-vs-rio-de-janeiro", "san-jose-cr-vs-panama-city"],
      emoji: "🌎"
    }
  ];

  return {
    list: uniqueResults,
    themes: themes
  };
};
