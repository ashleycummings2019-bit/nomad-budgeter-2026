const cityCountryComparisons = require('../src/_data/cityCountryComparisons.js');

const results = cityCountryComparisons();
const slugs = results.map(r => r.slug);
const seen = new Set();
const duplicates = [];

slugs.forEach(slug => {
    if (seen.has(slug)) {
        duplicates.push(slug);
    }
    seen.add(slug);
});

console.log('Duplicate Slugs in cityCountryComparisons:', duplicates);
if (duplicates.length > 0) {
    const firstDup = duplicates[0];
    const items = results.filter(r => r.slug === firstDup);
    console.log('Conflict items:', JSON.stringify(items, null, 2));
}
