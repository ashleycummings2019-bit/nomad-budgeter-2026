const path = require("path");
const cities = require(path.resolve(__dirname, "../src/_data/cities.json"));
const countries = require(path.resolve(__dirname, "../src/_data/countries.json"));

function getComparisons() {
  const results = [];
  cities.forEach((city) => {
    countries.forEach((country) => {
      if (city.countrySlug === country.slug) return;
      const slug = `${city.slug}-vs-${country.slug}`;
      results.push(slug);
    });
  });
  return results;
}

const comparisons = getComparisons();
const seen = new Set();
const duplicates = [];

comparisons.forEach(slug => {
  if (seen.has(slug)) {
    duplicates.push(slug);
  }
  seen.add(slug);
});

console.log("Total comparisons:", comparisons.length);
console.log("Unique comparisons:", seen.size);
console.log("Duplicates found:", duplicates.length);
if (duplicates.length > 0) {
  console.log("Examples of duplicates:", duplicates.slice(0, 10));
}
