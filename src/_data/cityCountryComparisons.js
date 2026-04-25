const cities = require("./cities.json");
const countries = require("./countries.json");

module.exports = function () {
  const countryMap = {};
  countries.forEach((c) => {
    countryMap[c.slug] = c;
  });

  const results = [];

  cities.forEach((city) => {
    countries.forEach((country) => {
      // Don't compare a city to its own country
      if (city.countrySlug === country.slug) return;

      const slug = `${city.slug}-vs-${country.slug}`;
      
      results.push({
        slug: slug,
        city: city,
        country: country,
        title: `${city.name} vs. ${country.name}: 2026 Digital Nomad Comparison`,
        description: `Comparing the lifestyle in ${city.name} with the digital nomad visa benefits of ${country.name}. Cost of living, tax, and visa requirements analyzed for 2026.`,
        type: "city-vs-country"
      });
    });
  });

  return results;
};
