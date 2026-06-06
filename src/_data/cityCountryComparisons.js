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

    // Deduplicate and limit to top 200 most relevant comparisons to prevent build hangs
    const uniqueResults = [];
    const seenSlugs = new Set();

    // Sort by priority first, then alphabetically by slug to ensure deterministic, stable output
    results.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.slug.localeCompare(b.slug);
    });

    for (const res of results) {
        if (!seenSlugs.has(res.slug)) {
            uniqueResults.push(res);
            seenSlugs.add(res.slug);
        }
        if (uniqueResults.length >= 200) break;
    }

    return uniqueResults;
};
