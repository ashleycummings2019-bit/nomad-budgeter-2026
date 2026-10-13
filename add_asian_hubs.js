const fs = require('fs');
const cFile = 'src/_data/countries.json';
const ciFile = 'src/_data/cities.json';

let countries = JSON.parse(fs.readFileSync(cFile, 'utf8'));
let cities = JSON.parse(fs.readFileSync(ciFile, 'utf8'));

countries.push({
  "name": "Japan",
  "slug": "japan",
  "code": "JP",
  "continent": "Asia",
  "visaName": "Digital Nomad Visa (2026 Active)",
  "tax": 0.2042,
  "taxType": "Flat 20.42% non-resident tax on income",
  "taxDuration": "6 months",
  "minIncomeMonthly": 5500,
  "visaDuration": "6 months (non-renewable)",
  "processingTime": "1-3 months",
  "costOfLiving": 2500,
  "internetSpeed": 120,
  "safety": 95,
  "image": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop",
  "description": "Japan's long-awaited digital nomad visa is live for 2026, allowing a 6-month stay. However, you are classified as a non-resident for tax purposes, subjecting your income to a brutal 20.42% flat tax rate from day one. Avoid the 183-day trap by not overstaying.",
  "taxSource": "https://www.nta.go.jp/english/",
  "visaSource": "https://www.mofa.go.jp/ca/fna/page22e_001033.html"
});

countries.push({
  "name": "South Korea",
  "slug": "south-korea",
  "code": "KR",
  "continent": "Asia",
  "visaName": "Workation Visa (F-1-D)",
  "tax": 0.19,
  "taxType": "19% flat rate for foreign workers (if applicable)",
  "taxDuration": "Up to 5 years",
  "minIncomeMonthly": 3000,
  "visaDuration": "1 year, renewable up to 2 years",
  "processingTime": "2-4 weeks",
  "costOfLiving": 2100,
  "internetSpeed": 150,
  "safety": 92,
  "image": "https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=2074&auto=format&fit=crop",
  "description": "South Korea's Workation visa is a powerhouse for 2026. While the internet and infrastructure are unparalleled, South Korea taxes non-residents on local income and residents on global income. Structuring is key here.",
  "taxSource": "https://www.nts.go.kr/english/main.do",
  "visaSource": "https://www.visa.go.kr"
});

cities.push({
  "name": "Tokyo",
  "slug": "tokyo",
  "country": "Japan",
  "countrySlug": "japan",
  "continent": "Asia",
  "costOfLiving": 2800,
  "internetSpeed": 130,
  "safety": 96,
  "nomadScore": 88,
  "population": "37M",
  "weather": "Temperate",
  "description": "The ultimate cyberpunk megacity. Incredible food, flawless infrastructure, but an unforgiving 20.42% tax rate from day one for nomads.",
  "image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2094&auto=format&fit=crop",
  "geo": { "lat": 35.6762, "lng": 139.6503 }
});

cities.push({
  "name": "Seoul",
  "slug": "seoul",
  "country": "South Korea",
  "countrySlug": "south-korea",
  "continent": "Asia",
  "costOfLiving": 2200,
  "internetSpeed": 160,
  "safety": 94,
  "nomadScore": 86,
  "population": "9.7M",
  "weather": "Continental",
  "description": "A 24/7 high-tech hub with the fastest internet on earth and a rapidly growing remote work culture thanks to the F-1-D Workation visa.",
  "image": "https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=2074&auto=format&fit=crop",
  "geo": { "lat": 37.5665, "lng": 126.9780 }
});

fs.writeFileSync(cFile, JSON.stringify(countries, null, 2));
fs.writeFileSync(ciFile, JSON.stringify(cities, null, 2));
