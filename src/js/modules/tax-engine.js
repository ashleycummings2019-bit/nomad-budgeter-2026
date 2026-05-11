/**
 * tax-engine.js
 * 2026 Digital Nomad Tax Rules & Calculations
 */

const TAX_RULES = {
    "Spain": (income) => income > 600000 ? 0.47 : 0.24, // Beckham Law
    "Portugal": () => 0.20, // NHR Successor
    "UAE": () => 0.00,
    "Malaysia": () => 0.00,
    "Greece": () => 0.22, // 50% reduction
    "Mexico": () => 0.15,
    "Italy": () => 0.05,
    "Croatia": () => 0.00,
    "Estonia": () => 0.20,
    "United States": (income) => {
        if (income > 200000) return 0.35;
        if (income > 100000) return 0.28;
        return 0.22;
    },
    "United Kingdom": (income) => {
        if (income > 150000) return 0.45;
        if (income > 50270) return 0.40;
        return 0.20;
    },
    "Germany": (income) => {
        if (income > 62810) return 0.42;
        return 0.30;
    },
    "Canada": (income) => {
        if (income > 235675) return 0.33;
        if (income > 165430) return 0.29;
        return 0.20;
    },
    "Australia": (income) => {
        if (income > 180000) return 0.45;
        if (income > 120000) return 0.37;
        return 0.30;
    },
    "France": (income) => {
        if (income > 168994) return 0.45;
        if (income > 78570) return 0.41;
        return 0.30;
    },
    "Ireland": (income) => {
        if (income > 40000) return 0.40;
        return 0.20;
    }
};

export const getTaxRate = (country, income) => {
    const rule = TAX_RULES[country];
    if (typeof rule === 'function') {
        return rule(income);
    }
    // Default fallback based on global averages if country not found
    return 0.25;
};

export const calculateNetIncome = (grossIncome, country) => {
    const rate = getTaxRate(country, grossIncome);
    const taxAmount = grossIncome * rate;
    const netIncome = grossIncome - taxAmount;
    return {
        gross: grossIncome,
        taxRate: rate,
        taxAmount: taxAmount,
        net: netIncome,
        monthlyNet: netIncome / 12
    };
};
