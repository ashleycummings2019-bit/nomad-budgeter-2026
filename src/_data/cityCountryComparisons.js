const cities = require("./cities.json");
const countries = require("./countries.json");

module.exports = function () {
  const countryMap = {};
  countries.forEach((c) => {
    countryMap[c.slug] = c;
  });

  const priorityHubs = [
    "bali", "lisbon", "dubai", "medellin", "chiang-mai", 
    "bangkok", "mexico-city", "valencia", "da-nang", "bansko", 
    "barcelona", "buenos-aires", "istanbul", "tbilisi", "athens", 
    "tokyo", "singapore", "kuala-lumpur", "tallinn"
  ];

  const results = [];

  cities.forEach((city) => {
    countries.forEach((country) => {
      // Don't compare a city to its own country
      if (city.countrySlug === country.slug) return;

      let priorityScore = 0;
      if (priorityHubs.includes(city.slug)) priorityScore += 10;
      if (city.continent === country.continent) priorityScore += 5;
      
      results.push({
        slug: `${city.slug}-vs-${country.slug}`,
        city: city,
        country: country,
        priority: priorityScore,
        title: `${city.name} vs. ${country.name}: 2026 Digital Nomad Comparison`,
        description: `Comparing the lifestyle in ${city.name} with the digital nomad visa benefits of ${country.name}. Cost of living, tax, and visa requirements analyzed for 2026.`,
        type: "city-vs-country"
      });
    });
  });

  // Limit to top 150 most relevant comparisons to maintain high content quality
  return results.sort((a, b) => b.priority - a.priority).slice(0, 150);
};

