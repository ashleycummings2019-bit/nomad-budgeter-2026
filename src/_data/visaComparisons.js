const countries = require("./countries.json");

const HOME_COUNTRIES = [
    { name: "United Kingdom", slug: "uk", taxRate: 0.40, type: "Self-Employed / High-Earner" },
    { name: "United States", slug: "usa", taxRate: 0.28, type: "Federal + State Average" },
    { name: "Germany", slug: "germany", taxRate: 0.42, type: "Standard Income Tax" },
    { name: "Canada", slug: "canada", taxRate: 0.29, type: "Federal + Provincial" },
    { name: "Australia", slug: "australia", taxRate: 0.37, type: "Resident Tax Rate" },
    { name: "France", slug: "france", taxRate: 0.41, type: "Standard Tax Bracket" },
    { name: "Ireland", slug: "ireland", taxRate: 0.40, type: "Higher Band Rate" }
];

module.exports = function() {
    const results = [];
    
    // Filter countries that actually have visa data
    const visaDestinations = countries.filter(c => c.visaName && c.tax !== undefined);

    visaDestinations.forEach(dest => {
        HOME_COUNTRIES.forEach(home => {
            const savings100k = Math.round(100000 * (home.taxRate - dest.tax));
            const monthlySavings = Math.round(savings100k / 12);
            
            results.push({
                slug: `${dest.slug}-visa-vs-${home.slug}-tax`,
                destination: dest,
                home: home,
                savings100k: savings100k,
                monthlySavings: monthlySavings,
                roiMultiple: (home.taxRate / dest.tax).toFixed(1),
                title: `${dest.name} ${dest.visaName} vs. ${home.name} Tax Calculator (2026)`,
                description: `Calculate your ROI moving to ${dest.name}. Save up to $${savings100k.toLocaleString()} in taxes vs. ${home.name} with the ${dest.visaName}.`
            });
        });
    });

    return results;
};
