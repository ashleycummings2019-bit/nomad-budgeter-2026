const countries = require("./countries.json");

module.exports = function () {
  const countryMap = {};
  countries.forEach((c) => {
    countryMap[c.slug] = c;
  });

  const slugs = countries.map(c => c.slug);
  const results = [];

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const slugA = slugs[i];
      const slugB = slugs[j];
      const forwardSlug = `${slugA}-vs-${slugB}`;

      const countryA = countryMap[slugA];
      const countryB = countryMap[slugB];

      if (!countryA || !countryB) continue;

      // Priority scoring: same continent is more relevant
      let priorityScore = 0;
      if (countryA.continent === countryB.continent) priorityScore += 10;
      
      // Bonus for popular regions
      if (countryA.continent === "Europe" || countryB.continent === "Europe") priorityScore += 5;

      results.push({
        slug: forwardSlug,
        countryA: countryA,
        countryB: countryB,
        priority: priorityScore,
        title: `${countryA.name} vs. ${countryB.name}: 2026 Digital Nomad Visa & Tax Comparison`,
        description: `Compare digital nomad visas, tax rates, and residency requirements: ${countryA.name} vs. ${countryB.name}. Which country is better for remote workers in 2026?`,
        type: "country-vs-country"
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

  return uniqueResults;
};

