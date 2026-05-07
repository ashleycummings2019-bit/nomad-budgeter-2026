const comparisons = require('../src/_data/cityCountryComparisons.js')();
const slugs = comparisons.map(c => c.slug);
const uniqueSlugs = new Set(slugs);

if (slugs.length !== uniqueSlugs.size) {
  console.log('Duplicate slugs found!');
  const counts = {};
  slugs.forEach(s => {
    counts[s] = (counts[s] || 0) + 1;
    if (counts[s] > 1) {
      console.log(`Duplicate slug: ${s}`);
    }
  });
} else {
  console.log('No duplicate slugs in cityCountryComparisons.');
}
