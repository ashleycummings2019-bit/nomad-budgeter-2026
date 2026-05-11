const cities = require('../src/_data/cities.json');
const countries = require('../src/_data/countries.json');

function checkDuplicates(data, name) {
    const slugs = data.map(i => i.slug);
    const unique = new Set(slugs);
    if (slugs.length !== unique.size) {
        console.log(`❌ ${name} has duplicates!`);
        const counts = {};
        slugs.forEach(s => counts[s] = (counts[s] || 0) + 1);
        Object.entries(counts).filter(([s, c]) => c > 1).forEach(([s, c]) => {
            console.log(`   - ${s}: ${c} occurrences`);
        });
    } else {
        console.log(`✅ ${name} is clean.`);
    }
}

checkDuplicates(cities, 'Cities');
checkDuplicates(countries, 'Countries');
