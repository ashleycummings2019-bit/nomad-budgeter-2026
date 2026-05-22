import fs from 'fs';
import path from 'path';

const CACHE_PATH = path.resolve('./src/_data/airtable_cache.json');
const CITIES_PATH = path.resolve('./src/_data/cities.json');

console.log('🛡️  Running build-time data validation...');

try {
  if (!fs.existsSync(CACHE_PATH) || !fs.existsSync(CITIES_PATH)) {
    console.error('❌ Validation failed: Required data files are missing.');
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  const cities = JSON.parse(fs.readFileSync(CITIES_PATH, 'utf-8'));

  if (cache.length < 10) {
    console.error('❌ Validation failed: airtable_cache.json has suspiciously few records.');
    process.exit(1);
  }

  const cacheSlugs = new Set(cache.map((r) => r['City Slug']));
  const missing = cities.filter((c) => !cacheSlugs.has(c.slug));

  if (missing.length > 0) {
    console.error('❌ Validation failed: ' + missing.length + ' cities are missing from the Airtable cache:');
    missing.forEach((c) => console.error('   - ' + c.slug));
    process.exit(1);
  }

  console.log('✅ Validation passed: 100% data coverage.');
} catch (error) {
  console.error('❌ Validation crashed:', error);
  process.exit(1);
}
