const fs = require('fs');
const path = require('path');

const cities = [
    "Lisbon", "London", "Dubai", "Bali", "Madrid", 
    "New York", "Bangkok", "Medellin", "Chiang Mai", "Tulum"
];

// Read the base template
const templatePath = path.join(__dirname, 'index.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// Create output directory for our programmatic SEO pages
const outputDir = path.join(__dirname, 'seo-pages');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

let generatedCount = 0;

function createPage(slug, title, desc, prefillCity) {
    let pageContent = template
        .replace('<title>Nomad Budgeter | Premium Tax & Living Calculator</title>', `<title>${title}</title>`)
        .replace(
            'content="Calculate your nomad budget with the world\'s most beautiful tax and cost of living calculator."', 
            `content="${desc}"`
        )
        .replace(
            '<meta property="og:title" content="Nomad Budgeter | Premium Nomad Tax & Cost of Living Calculator">', 
            `<meta property="og:title" content="${title}">`
        )
        .replace(
            '<meta property="og:description" content="Calculate your financial nomad budget across global nomad hubs including Lisbon, Dubai, and London.">', 
            `<meta property="og:description" content="${desc}">`
        )
        .replace(
            '"name": "Nomad Budgeter Tax Calculator"',
            `"name": "${title}"`
        )
        .replace(
            'id="location" placeholder="e.g. Lisbon, Dubai, London" required>', 
            `<input type="text" id="location" value="${prefillCity}" required>`
        );
        
    // Fix relative paths for assets since these pages will live in /seo-pages/
    pageContent = pageContent.replace('href="index.css"', 'href="../index.css"');
    pageContent = pageContent.replace('src="main.js"', 'src="../main.js"');
    
    fs.writeFileSync(path.join(outputDir, `${slug}.html`), pageContent);
    generatedCount++;
}

// 1. Generate Single City Pages (e.g., lisbon-digital-nomad-tax-calculator.html)
cities.forEach(city => {
    const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-digital-nomad-tax-calculator`;
    const title = `Nomad Budgeter | ${city} Digital Nomad Tax & Cost of Living Calculator`;
    const desc = `Calculate your nomad budget, net income, and exact cost of living as a digital nomad in ${city}.`;
    
    createPage(slug, title, desc, city);
});

// 2. Generate Comparison Pages (e.g., bali-vs-london-cost-of-living.html)
for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
        const cityA = cities[i];
        const cityB = cities[j];
        const slug = `${cityA.toLowerCase().replace(/\s+/g, '-')}-vs-${cityB.toLowerCase().replace(/\s+/g, '-')}-cost-of-living`;
        const title = `Nomad Budgeter | ${cityA} vs ${cityB} - Digital Nomad Cost of Living & Tax Calculator`;
        const desc = `Compare cost of living, taxes, and financial plans for digital nomads: ${cityA} vs ${cityB}. Which destination fits your budget better?`;
        
        createPage(slug, title, desc, cityA);
    }
}

console.log(`✅ Success! Generated ${generatedCount} Programmatic SEO pages for Nomad Budgeter in the /seo-pages directory.`);
