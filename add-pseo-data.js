const fs = require('fs');

const countriesFile = './src/_data/countries.json';
const citiesFile = './src/_data/cities.json';

const newCountries = [
  {
    "name": "Costa Rica",
    "slug": "costa-rica",
    "code": "CR",
    "continent": "Americas",
    "visaName": "Digital Nomad Visa (Estancia)",
    "tax": 0,
    "taxType": "Total exemption from income tax",
    "taxDuration": "1 year (renewable to 2)",
    "minIncomeMonthly": 3000,
    "visaDuration": "1 year, renewable",
    "processingTime": "2 weeks",
    "requirements": ["Proof of $3,000/mo income ($4k for families)", "Valid passport", "Health insurance covering $50k"],
    "currency": "CRC",
    "language": "Spanish",
    "highlights": ["0% Income Tax", "Pura Vida lifestyle", "Incredible biodiversity"],
    "cities": ["san-jose", "tamarindo"],
    "intro": "Costa Rica's Digital Nomad Visa is a fast-track to 0% income tax. You get a completely tax-free setup in a lush, eco-friendly haven with incredible surfing and a laid-back Pura Vida culture."
  },
  {
    "name": "Mauritius",
    "slug": "mauritius",
    "code": "MU",
    "continent": "Africa",
    "visaName": "Premium Travel Visa",
    "tax": 0,
    "taxType": "Foreign income not remitted to Mauritius is untaxed",
    "taxDuration": "1 year",
    "minIncomeMonthly": 1500,
    "visaDuration": "1 year, renewable",
    "processingTime": "3 days",
    "requirements": ["Proof of $1,500/mo income", "Return flight booking", "Travel insurance"],
    "currency": "MUR",
    "language": "English, French",
    "highlights": ["Zero tax on foreign income", "Tropical island", "Extremely fast processing"],
    "cities": ["port-louis", "grand-baie"],
    "intro": "Mauritius offers the Premium Visa completely free of charge. Digital nomads can live on this stunning Indian Ocean island without paying local taxes on money earned abroad, all while enjoying world-class beaches."
  },
  {
    "name": "Uruguay",
    "slug": "uruguay",
    "code": "UY",
    "continent": "Americas",
    "visaName": "Digital Nomad Permit",
    "tax": 0,
    "taxType": "Tax holiday on foreign-sourced tech income",
    "taxDuration": "180 days",
    "minIncomeMonthly": 0,
    "visaDuration": "180 days",
    "processingTime": "1 week",
    "requirements": ["Sign declaration of remote work", "Clean criminal record", "Passport"],
    "currency": "UYU",
    "language": "Spanish",
    "highlights": ["South America's safest country", "Simple online process", "Fast internet"],
    "cities": ["montevideo", "punta-del-este"],
    "intro": "Uruguay launched a hyper-simple online digital nomad permit. It's one of the most developed, stable, and safe countries in South America, making it a premium destination for remote workers."
  }
];

const newCities = [
  {
    "name": "San Jose",
    "slug": "san-jose",
    "country": "Costa Rica",
    "countrySlug": "costa-rica",
    "code": "CR",
    "continent": "Americas",
    "col": 1800,
    "rent": 850,
    "tax": 0,
    "score": 82,
    "visa": "Digital Nomad Visa",
    "visaMinIncome": 3000,
    "currency": "CRC",
    "highlights": ["Capital city infrastructure", "Great coffee culture", "Close to cloud forests"],
    "intro": "San Jose serves as the perfect launchpad for Costa Rica. While not on the beach, it offers the best coworking spaces, healthcare, and reliable internet in the country.",
    "prices_usd": { "cappuccino": 3.5, "mealCheap": 8.0, "beerLocal": 2.5, "coworkingDay": 15 },
    "prices_local": { "cappuccino": 1800, "mealCheap": 4000, "beerLocal": 1250, "coworkingDay": 7500 },
    "exchangeRate": 510.5,
    "exchangeRateDate": "2026-09-30"
  },
  {
    "name": "Tamarindo",
    "slug": "tamarindo",
    "country": "Costa Rica",
    "countrySlug": "costa-rica",
    "code": "CR",
    "continent": "Americas",
    "col": 2200,
    "rent": 1200,
    "tax": 0,
    "score": 85,
    "visa": "Digital Nomad Visa",
    "visaMinIncome": 3000,
    "currency": "CRC",
    "highlights": ["Surfer's paradise", "Strong expat community", "Beachfront coworking"],
    "intro": "Tamarindo is the crown jewel of Costa Rica's digital nomad scene. Expect higher prices than the capital, but you're paying for world-class surf breaks and a vibrant international community.",
    "prices_usd": { "cappuccino": 4.5, "mealCheap": 12.0, "beerLocal": 4.0, "coworkingDay": 25 },
    "prices_local": { "cappuccino": 2300, "mealCheap": 6000, "beerLocal": 2000, "coworkingDay": 12500 },
    "exchangeRate": 510.5,
    "exchangeRateDate": "2026-09-30"
  },
  {
    "name": "Port Louis",
    "slug": "port-louis",
    "country": "Mauritius",
    "countrySlug": "mauritius",
    "code": "MU",
    "continent": "Africa",
    "col": 1200,
    "rent": 600,
    "tax": 0,
    "score": 75,
    "visa": "Premium Travel Visa",
    "visaMinIncome": 1500,
    "currency": "MUR",
    "highlights": ["Urban hub", "Incredible street food", "Affordable living"],
    "intro": "The capital of Mauritius blends French, Indian, and African cultures. Port Louis offers excellent infrastructure and deeply affordable costs for nomads utilizing the Premium Visa.",
    "prices_usd": { "cappuccino": 2.5, "mealCheap": 5.0, "beerLocal": 2.0, "coworkingDay": 10 },
    "prices_local": { "cappuccino": 115, "mealCheap": 230, "beerLocal": 90, "coworkingDay": 460 },
    "exchangeRate": 46.2,
    "exchangeRateDate": "2026-09-30"
  },
  {
    "name": "Montevideo",
    "slug": "montevideo",
    "country": "Uruguay",
    "countrySlug": "uruguay",
    "code": "UY",
    "continent": "Americas",
    "col": 2000,
    "rent": 900,
    "tax": 0,
    "score": 80,
    "visa": "Digital Nomad Permit",
    "visaMinIncome": 0,
    "currency": "UYU",
    "highlights": ["High quality of life", "Beautiful Rambla", "Safe & stable"],
    "intro": "Montevideo is one of South America's safest and most progressive capitals. Enjoy coastal living along the Rambla with fast internet and a sophisticated cultural scene.",
    "prices_usd": { "cappuccino": 4.0, "mealCheap": 15.0, "beerLocal": 3.5, "coworkingDay": 20 },
    "prices_local": { "cappuccino": 160, "mealCheap": 600, "beerLocal": 140, "coworkingDay": 800 },
    "exchangeRate": 39.5,
    "exchangeRateDate": "2026-09-30"
  }
];

// Read and append countries
let countries = JSON.parse(fs.readFileSync(countriesFile, 'utf8'));
const existingCountrySlugs = new Set(countries.map(c => c.slug));
newCountries.forEach(nc => {
  if (!existingCountrySlugs.has(nc.slug)) {
    countries.push(nc);
    console.log(`Added country: ${nc.name}`);
  }
});
fs.writeFileSync(countriesFile, JSON.stringify(countries, null, 2));

// Read and append cities
let cities = JSON.parse(fs.readFileSync(citiesFile, 'utf8'));
const existingCitySlugs = new Set(cities.map(c => c.slug));
newCities.forEach(nc => {
  if (!existingCitySlugs.has(nc.slug)) {
    cities.push(nc);
    console.log(`Added city: ${nc.name}`);
  }
});
fs.writeFileSync(citiesFile, JSON.stringify(cities, null, 2));

console.log("Programmatic SEO expansion complete!");
