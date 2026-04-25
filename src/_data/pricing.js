module.exports = {
  tiers: {
    1: { price: 19, label: "Basic" },
    2: { price: 19, label: "Standard" },
    3: { price: 19, label: "Premium" }
  },
  getCountryTier: (countryName) => {
    // Keeping logic but pointing to same price as requested
    return 1; 
  }
};
