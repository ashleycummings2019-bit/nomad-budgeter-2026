const path = require('path');
const cityCountryComparisons = require(path.join(process.cwd(), 'src/_data/cityCountryComparisons.js'));
const data = cityCountryComparisons();
const slugs = data.map(d => d.slug);
const seen = new Set();
const duplicates = [];

slugs.forEach(slug => {
  if (seen.has(slug)) {
    duplicates.push(slug);
  }
  seen.add(slug);
});

if (duplicates.length > 0) {
  console.log('Duplicate slugs found:', duplicates);
} else {
  console.log('No duplicate slugs found in cityCountryComparisons.');
}
