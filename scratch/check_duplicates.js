const cities = require("/Users/ashleycummings/Documents/tax :cost of living calculator/src/_data/cities.json");
const countries = require("/Users/ashleycummings/Documents/tax :cost of living calculator/src/_data/countries.json");

const countryMap = {};
countries.forEach((c) => {
  countryMap[c.slug] = c;
});

const results = [];
const slugs = new Set();
const duplicates = [];

cities.forEach((city) => {
  countries.forEach((country) => {
    if (city.countrySlug === country.slug) return;
    const slug = `${city.slug}-vs-${country.slug}`;
    if (slugs.has(slug)) {
      duplicates.push(slug);
    }
    slugs.add(slug);
    results.push(slug);
  });
});

console.log("Total comparisons:", results.length);
console.log("Unique slugs:", slugs.size);
console.log("Duplicates:", duplicates);
