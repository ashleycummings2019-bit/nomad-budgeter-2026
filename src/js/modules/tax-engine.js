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
        // Digital Nomad Expat Tax Framework (2026)
        let seTax = 0;
        if (income > 400) {
            // Self-Employment Tax: 15.3% on 92.35% of net earnings
            seTax = (income * 0.9235) * 0.153;
        }

        // FEIE Exclusion (2026 Limit: $132,900)
        const feieLimit = 132900;
        // Half of SE tax is deductible
        const taxableIncome = Math.max(0, income - feieLimit - (seTax / 2)); 

        // Progressive Income Tax on remaining (Simplified)
        let incomeTax = 0;
        if (taxableIncome > 200000) incomeTax = taxableIncome * 0.35;
        else if (taxableIncome > 100000) incomeTax = taxableIncome * 0.28;
        else if (taxableIncome > 40000) incomeTax = taxableIncome * 0.22;
        else if (taxableIncome > 11000) incomeTax = taxableIncome * 0.12;
        else if (taxableIncome > 0) incomeTax = taxableIncome * 0.10;

        return {
            rate: (seTax + incomeTax) / income,
            breakdown: {
                seTax: seTax,
                usTax: incomeTax,
                localTax: 0
            }
        };
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
        const result = rule(income);
        return typeof result === 'object' ? result : { rate: result, breakdown: { localTax: income * result, seTax: 0, usTax: 0 } };
    }
    // Default fallback based on global averages if country not found
    const rate = 0.25;
    return { rate, breakdown: { localTax: income * rate, seTax: 0, usTax: 0 } };
};

export const calculateNetIncome = (grossIncome, country) => {
    const taxData = getTaxRate(country, grossIncome);
    const rate = taxData.rate;
    const taxAmount = grossIncome * rate;
    const netIncome = grossIncome - taxAmount;
    return {
        gross: grossIncome,
        taxRate: rate,
        taxAmount: taxAmount,
        breakdown: taxData.breakdown,
        net: netIncome,
        monthlyNet: netIncome / 12
    };
};
