const cities = require("../src/_data/cities.json");
const countries = require("../src/_data/countries.json");
const cityCountryComparisons = require("../src/_data/cityCountryComparisons.js")();

const seenSlugs = new Set();
const duplicates = [];

cityCountryComparisons.forEach(item => {
  if (seenSlugs.has(item.slug)) {
    duplicates.push(item.slug);
  }
  seenSlugs.add(item.slug);
});

console.log("Total items:", cityCountryComparisons.length);
console.log("Unique slugs:", seenSlugs.size);
console.log("Duplicates:", duplicates.length);
if (duplicates.length > 0) {
  console.log("First 10 duplicates:", duplicates.slice(0, 10));
}
