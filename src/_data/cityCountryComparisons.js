const cities = require("./cities.json");
const countries = require("./countries.json");

module.exports = function () {
    const countryMap = {};
    countries.forEach((c) => {
        countryMap[c.slug] = c;
    });

    const priorityHubs = [
        "bali", "lisbon", "dubai", "medellin", "chiang-mai", 
        "bangkok", "mexico-city", "valencia", "da-nang", "bansko", 
        "barcelona", "buenos-aires", "istanbul", "tbilisi", "athens", 
        "tokyo", "singapore", "kuala-lumpur", "tallinn", "cape-town"
    ];

    const results = [];

    cities.forEach((city) => {
        countries.forEach((country) => {
            // Don't compare a city to its own country
            if (city.countrySlug === country.slug) return;

            const slug = `${city.slug}-vs-${country.slug}`;

            let priorityScore = 0;
            if (priorityHubs.includes(city.slug)) priorityScore += 10;
            if (city.continent === country.continent) priorityScore += 5;

            results.push({
                slug: slug,
                city: city,
                country: country,
                priority: priorityScore,
                title: `${city.name} vs. ${country.name}: 2026 Digital Nomad Comparison`,
                description: `Comparing the lifestyle in ${city.name} with the digital nomad visa benefits of ${country.name}. Cost of living, tax, and visa requirements analyzed for 2026.`,
                type: "city-vs-country"
            });
        });
    });

    // Deduplicate and limit to top 250 most relevant comparisons
    const uniqueResults = [];
    const seenSlugs = new Set();

    // Sort by priority first so we keep the better quality ones if there's a collision
    results.sort((a, b) => b.priority - a.priority);

    for (const res of results) {
        if (!seenSlugs.has(res.slug)) {
            uniqueResults.push(res);
            seenSlugs.add(res.slug);
        }
        if (uniqueResults.length >= 250) break;
    }

    return uniqueResults;
};
