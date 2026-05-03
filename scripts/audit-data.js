const fs = require('fs');
const path = require('path');

const citiesPath = path.join(__dirname, '../src/_data/cities.json');
const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

console.log(`\n🔍 Auditing Data Richness for ${cities.length} cities...\n`);

const holes = [];

cities.forEach(city => {
    const missing = [];
    if (!city.tax && city.tax !== 0) missing.push('tax');
    if (!city.col) missing.push('col');
    if (!city.external_image_url) missing.push('image');
    if (!city.visa || city.visa === 'N/A') missing.push('visa');
    if (!city.prices_local || Object.keys(city.prices_local).length === 0) missing.push('local_prices');
    if (!city.expertNotes) missing.push('expert_notes');
    
    if (missing.length > 0) {
        holes.push({ name: city.name, missing });
    }
});

if (holes.length > 0) {
    console.log(`⚠️ Found data holes in ${holes.length} cities:`);
    holes.forEach(h => {
        console.log(`   - ${h.name.padEnd(20)}: [${h.missing.join(', ')}]`);
    });
} else {
    console.log('✅ ALL CITIES HAVE COMPLETE CORE DATA SETS.');
}

console.log('\n📊 Summary of Data Fields:');
const fields = ['tax', 'col', 'external_image_url', 'visa', 'prices_local', 'expertNotes', 'affiliate_url'];
fields.forEach(f => {
    const count = cities.filter(c => {
        const val = c[f];
        if (val === undefined || val === null) return false;
        if (typeof val === 'object') return Object.keys(val).length > 0;
        if (typeof val === 'string') return val.length > 0;
        return true; // Numbers (including 0) are valid
    }).length;
    console.log(`   - ${f.padEnd(20)}: ${count}/${cities.length} (${Math.round(count/cities.length * 100)}%)`);
});

console.log('\n--- End Audit ---\n');
