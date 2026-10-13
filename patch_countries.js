const fs = require('fs');
const file = 'src/_data/countries.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

for (let c of data) {
  if (c.name === 'Georgia') {
    c.taxType = '1% for existing businesses (Ends Mar 2026 for pure remote)';
    c.description = c.description + ' Warning: As of March 2026, the 1% freelancer regime requires strict local corporate substance. Seek legal counsel to avoid the 183-day trap.';
  }
  if (c.name === 'Portugal') {
    c.taxType = 'IFICI Regime (Flat 20% on eligible income)';
    c.description = c.description + ' Portugal has replaced the NHR with the IFICI tax regime for 2026. Only specific high-value professions qualify for the 20% flat rate.';
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
