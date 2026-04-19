/**
 * Nomad Budgeter | Financial Logic (v2.2 - Full 2026 Vault)
 */

const API_KEYS = {
    exchangeRate: '4fee8fc6019902b0118cd93b',
    apiNinjas: 'w6V4eBiDD9LbVmMTaKevQ5BWZIH350AKg1AoGBYt'
};

// Expanded 2026 Data Vault (Targets all 5 major showdowns)
const NOMAD_DESTINATIONS = {
    "spain": { name: "Spain", minIncomeUSD: 3105, tax: 0.24, col: 2500, score_base: 84 },
    "portugal": { name: "Portugal", minIncomeUSD: 4100, tax: 0.20, col: 2800, score_base: 88 },
    "dubai": { name: "Dubai", minIncomeUSD: 5000, tax: 0.00, col: 4500, score_base: 95 },
    "bali": { name: "Bali", minIncomeUSD: 2000, tax: 0.00, col: 1800, score_base: 92 },
    "japan": { name: "Japan", minIncomeUSD: 5330, tax: 0.00, col: 3500, score_base: 85 },
    "georgia": { name: "Georgia", minIncomeUSD: 2000, tax: 0.01, col: 1500, score_base: 80 },
    "thailand": { name: "Thailand", minIncomeUSD: 3000, tax: 0.15, col: 1900, score_base: 91 },
    "mexico": { name: "Mexico", minIncomeUSD: 3500, tax: 0.25, col: 2200, score_base: 82 },
    "colombia": { name: "Colombia", minIncomeUSD: 1000, tax: 0.20, col: 1300, score_base: 85 },
    "greece": { name: "Greece", minIncomeUSD: 3800, tax: 0.15, col: 2400, score_base: 86 }
};

const CITY_DATABASE = {
    "lisbon": { col: 2800, score_base: 88, country: "Portugal", tax: 0.20 },
    "dubai": { col: 4500, score_base: 95, country: "UAE", tax: 0.00 },
    "london": { col: 4000, score_base: 72, country: "UK", tax: 0.30 },
    "bali": { col: 1800, score_base: 92, country: "Indonesia", tax: 0.00 },
    "new york": { col: 5000, score_base: 65, country: "USA", tax: 0.35 },
    "madrid": { col: 2500, score_base: 84, country: "Spain", tax: 0.24 },
    "bangkok": { col: 1900, score_base: 89, country: "Thailand", tax: 0.15 },
    "medellin": { col: 1300, score_base: 85, country: "Colombia", tax: 0.20 },
    "chiang mai": { col: 1100, score_base: 94, country: "Thailand", tax: 0.15 },
    "tulum": { col: 2500, score_base: 78, country: "Mexico", tax: 0.25 },
    "tbilisi": { col: 1500, score_base: 80, country: "Georgia", tax: 0.01 },
    "tokyo": { col: 3500, score_base: 85, country: "Japan", tax: 0.00 },
    "athens": { col: 2400, score_base: 86, country: "Greece", tax: 0.15 }
};

class NomadBudgeterCalculator {
    constructor() {
        this.cachedRates = null;
        this.fallbackRates = { "USD": 1, "EUR": 0.92, "AED": 3.67, "IDR": 15800, "GBP": 0.79, "THB": 36.5, "MXN": 17.1 };
        this.initEventListeners();
        this.fetchCurrencyRates();
    }

    initEventListeners() {
        const btn = document.getElementById('calculate-btn');
        if (btn) btn.addEventListener('click', () => this.handleCalculation());
        
        const compBtn = document.getElementById('compare-btn');
        if (compBtn) compBtn.addEventListener('click', () => this.handleComparison());
    }

    async fetchWithTimeout(resource, options = {}) {
        const { timeout = 5000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    }

    async fetchCurrencyRates() {
        if (this.cachedRates) return this.cachedRates;
        try {
            const response = await this.fetchWithTimeout(`https://v6.exchangerate-api.com/v6/${API_KEYS.exchangeRate}/latest/USD`);
            const data = await response.json();
            if (data.result === "success") {
                this.cachedRates = data.conversion_rates;
                return this.cachedRates;
            }
        } catch (error) {
            console.warn("Currency Sync Failed:", error.message);
        }
        return this.fallbackRates;
    }

    async fetchCityData(city) {
        try {
            const response = await this.fetchWithTimeout(`https://api.api-ninjas.com/v1/city?name=${city}`, {
                headers: { 'X-Api-Key': API_KEYS.apiNinjas }
            });
            const data = await response.json();
            if (data && data.length > 0) return data[0];
        } catch (error) {
            console.warn("City Sync Failed:", error.message);
        }
        return null;
    }

    async fetchIncomeTax(income, countryCode) {
        try {
            const response = await this.fetchWithTimeout(`https://api.api-ninjas.com/v1/incometaxcalculator?income=${income}&country=${countryCode}`, {
                headers: { 'X-Api-Key': API_KEYS.apiNinjas }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("Tax Sync Failed:", error.message);
        }
        return null;
    }

    async handleCalculation() {
        try {
            const income = parseFloat(document.getElementById('income').value);
            const cityInput = document.getElementById('location').value.toLowerCase().trim();
            const userExpenses = parseFloat(document.getElementById('expenses').value) || 0;

            if (!income || !cityInput) {
                alert("Please enter details.");
                return;
            }

            this.toggleLoading(true);

            const [rates, cityDataAPI] = await Promise.all([
                this.fetchCurrencyRates(),
                this.fetchCityData(cityInput)
            ]);
            
            let countryCode = "US";
            let actualCityName = cityInput.charAt(0).toUpperCase() + cityInput.slice(1);
            let countryName = "Unknown";

            if (cityDataAPI && cityDataAPI.country) {
                countryCode = cityDataAPI.country;
                actualCityName = cityDataAPI.name;
            }

            try {
                const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
                countryName = displayNames.of(countryCode);
            } catch (e) {
                countryName = countryCode;
            }

            const taxData = await this.fetchIncomeTax(income, countryCode);
            const localFallback = CITY_DATABASE[cityInput] || NOMAD_DESTINATIONS[cityInput];
            
            let effectiveTaxRate = 0.25;
            if (taxData && taxData.total_tax !== undefined) {
                effectiveTaxRate = parseFloat(taxData.total_tax) / income;
            } else if (localFallback) {
                effectiveTaxRate = localFallback.tax;
            }

            let monthlyCol = 2500;
            if (localFallback) {
                monthlyCol = localFallback.col;
                countryName = localFallback.country || localFallback.name;
            }

            const scoreBase = localFallback ? localFallback.score_base : 75;

            await new Promise(resolve => setTimeout(resolve, 800));

            const finalData = {
                country: countryName,
                tax: effectiveTaxRate,
                col: monthlyCol,
                score_base: scoreBase
            };

            this.updateUI(income, actualCityName, finalData, userExpenses);
        } catch (globalError) {
            console.error("Failure:", globalError);
        } finally {
            this.toggleLoading(false);
        }
    }
    
    handleComparison() {
        const incomeInput = document.getElementById('compare-income');
        if (!incomeInput) return;
        
        const income = parseFloat(incomeInput.value);
        if (!income) {
            alert("Please enter income.");
            return;
        }

        const destAId = incomeInput.dataset.desta;
        const destBId = incomeInput.dataset.destb;

        const destA = NOMAD_DESTINATIONS[destAId];
        const destB = NOMAD_DESTINATIONS[destBId];

        if (!destA || !destB) return;

        const netA = (income * (1 - destA.tax)) / 12 - destA.col;
        const netB = (income * (1 - destB.tax)) / 12 - destB.col;

        const resEl = document.getElementById('comparison-result');
        if (resEl) {
            resEl.innerHTML = `
                <div style="background: var(--bg-dark); border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 12px; margin-top: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: #fff; font-size: 1rem;">Monthly Savings Potential</h3>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                        <span>${destA.name}</span>
                        <strong style="color: ${netA > netB ? '#10b981' : '#fff'}">$${this.formatSimple(netA)} / mo</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>${destB.name}</span>
                        <strong style="color: ${netB > netA ? '#10b981' : '#fff'}">$${this.formatSimple(netB)} / mo</strong>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 1rem; line-height: 1.4;">
                        ${netA > netB ? destA.name : destB.name} leaves you with <strong>$${this.formatSimple(Math.abs(netA - netB))} more</strong> per month.
                    </p>
                </div>
            `;
        }
    }

    formatSimple(num) {
        return Math.round(num).toLocaleString();
    }

    toggleLoading(isLoading) {
        const loadingEl = document.getElementById('loading');
        const btn = document.getElementById('calculate-btn');
        if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
        if (btn) {
            btn.disabled = isLoading;
            btn.innerText = isLoading ? "Syncing Market Data..." : "Calculate My Budget";
        }
    }

    updateUI(grossAnnual, cityName, cityData, userExpenses) {
        const monthlyGross = grossAnnual / 12;
        const taxAmount = monthlyGross * cityData.tax;
        const netMonthly = monthlyGross - taxAmount;
        const totalExpenses = userExpenses > 0 ? userExpenses : cityData.col;
        const savings = netMonthly - totalExpenses;
        
        const taxRatePercent = (cityData.tax * 100).toFixed(0);
        const savingsRatio = Math.max(0, Math.min(1, savings / netMonthly));
        const budgetScore = Math.round(cityData.score_base * (0.5 + savingsRatio * 0.5));

        const emptyState = document.getElementById('empty-state');
        const resultsPanel = document.getElementById('results-panel');
        
        if (emptyState) emptyState.classList.add('hidden');
        if (resultsPanel) resultsPanel.classList.remove('hidden');
        
        document.getElementById('city-badge').innerText = `${cityName}, ${cityData.country}`;
        document.getElementById('res-net-monthly').innerText = this.formatCurrency(netMonthly);
        document.getElementById('res-tax-rate').innerText = `${taxRatePercent}%`;
        document.getElementById('res-savings').innerText = this.formatCurrency(savings);
        
        const colIndex = totalExpenses > 4000 ? "Very High" : totalExpenses > 2500 ? "High" : "Moderate";
        document.getElementById('res-col-index').innerText = colIndex;

        this.animateScore(budgetScore);
        this.updateCommentary(budgetScore, savings);
    }

    animateScore(score) {
        const ring = document.getElementById('aura-ring');
        const val = document.getElementById('aura-value');
        if (!ring || !val) return;
        let current = 0;
        const interval = setInterval(() => {
            if (current >= score) {
                clearInterval(interval);
            } else {
                current++;
                val.innerText = current;
                ring.style.background = `conic-gradient(var(--aura-primary, #8b5cf6) ${current}%, transparent 0%)`;
            }
        }, 15);
    }

    updateCommentary(score, savings) {
        let text = score > 90 ? "Excellent balance of income vs. cost." : score > 70 ? "Stable and sustainable budget." : "High local costs are limiting savings.";
        if (savings < 0) text += " ⚠️ ALERT: Expenses exceed net income.";
        const commentaryEl = document.getElementById('aura-commentary');
        if (commentaryEl) commentaryEl.innerText = text;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NomadBudgeterCalculator();
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieAccept = document.getElementById('cookie-accept');
    if (localStorage.getItem('nb_cookie_accepted') === 'true' && cookieBanner) cookieBanner.classList.add('hidden');
    if (cookieAccept) {
        cookieAccept.addEventListener('click', () => {
            localStorage.setItem('nb_cookie_accepted', 'true');
            if (cookieBanner) cookieBanner.classList.add('hidden');
        });
    }
});
