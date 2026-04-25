const countries = require("./countries.json");

module.exports = function () {
  const countryMap = {};
  countries.forEach((c) => {
    countryMap[c.slug] = c;
  });

  const slugs = countries.map(c => c.slug);
  const results = [];
  const existingSlugs = new Set();

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const slugA = slugs[i];
      const slugB = slugs[j];
      const forwardSlug = `${slugA}-vs-${slugB}`;

      const countryA = countryMap[slugA];
      const countryB = countryMap[slugB];

      if (!countryA || !countryB) continue;

      // Comparison metrics
      const taxDiff = Math.abs(countryA.tax - countryB.tax);
      const incomeDiff = Math.abs(countryA.minIncomeMonthly - countryB.minIncomeMonthly);
      
      results.push({
        slug: forwardSlug,
        countryA: countryA,
        countryB: countryB,
        title: `${countryA.name} vs. ${countryB.name}: 2026 Digital Nomad Visa & Tax Comparison`,
        description: `Compare digital nomad visas, tax rates, and residency requirements: ${countryA.name} vs. ${countryB.name}. Which country is better for remote workers in 2026?`,
        type: "country-vs-country"
      });

      existingSlugs.add(forwardSlug);
    }
  }

  return results;
};
