const getComparisons = require('../src/_data/cityCountryComparisons.js');
const results = getComparisons();
const slugs = results.map(r => r.slug);
const unique = new Set(slugs);

console.log(`Total results: ${results.length}`);
console.log(`Unique slugs: ${unique.size}`);

if (slugs.length !== unique.size) {
    console.log('❌ Duplicates found in cityCountryComparisons output!');
    const counts = {};
    slugs.forEach(s => counts[s] = (counts[s] || 0) + 1);
    Object.entries(counts).filter(([s, c]) => c > 1).forEach(([s, c]) => {
        console.log(`   - ${s}: ${c} occurrences`);
    });
} else {
    console.log('✅ cityCountryComparisons output is clean.');
}
