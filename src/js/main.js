/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   NOMAD BUDGETER — Main Application (v3.0)          ║
 * ║   Architecture: Modular ES Modules                  ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { getTaxRate, calculateNetIncome } from './modules/tax-engine.js';
import { getCityData, getExchangeRates } from './modules/api-client.js';
import { animateScore, updateMetricBars, updateIncomeSimulator, showToast } from './modules/ui-engine.js';
import { getVisaInfo, calculateVisaROI } from './modules/affiliates.js';
import { formatCurrency, formatPercent, debounce, isValidEmail } from './modules/utils.js';

// ─── State Management ───
const state = {
    income: 100000,
    targetCity: '',
    targetCountry: 'Spain',
    currentCountry: 'United States',
    cityData: null,
    rates: null,
    lastUpdate: null,
    isCalculating: false
};

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c✨ Nomad Budgeter v3.0 Initializing...', 'color: #8b5cf6; font-weight: bold;');
    
    initEventListeners();
    await preloadData();
    
    // Check if URL has params (e.g., from a specific city page)
    const urlParams = new URLSearchParams(globalThis.location.search);
    if (urlParams.has('city')) {
        const city = urlParams.get('city');
        document.getElementById('target-city').value = city;
        runCalculation();
    }
});

async function preloadData() {
    try {
        state.rates = await getExchangeRates();
        console.log('✅ Rates preloaded');
    } catch (e) {
        console.warn('Preload failed:', e.message);
        showToast('Real-time currency data currently unavailable. Using cached rates.', 'warning');
    }
}

// ─── Event Listeners ───
function initEventListeners() {
    const calcBtn = document.getElementById('calculate-btn');
    const incomeInput = document.getElementById('calc-income');
    const cityInput = document.getElementById('calc-city');
    const incomeSlider = document.getElementById('income-slider');

    if (calcBtn) calcBtn.addEventListener('click', () => runCalculation());
    
    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') runCalculation();
        });
    }

    if (incomeInput) {
        incomeInput.addEventListener('input', debounce((e) => {
            state.income = Number.parseFloat(e.target.value) || 0;
            if (state.cityData) {
                const results = calculateResults();
                updateUI(results);
            }
        }, 500));
    }

    if (incomeSlider) {
        incomeSlider.addEventListener('input', (e) => {
            const val = Number.parseFloat(e.target.value);
            state.income = val;
            if (incomeInput) incomeInput.value = val;
            
            // Live update simulation
            const taxRate = getTaxRate(state.targetCountry, state.income);
            updateIncomeSimulator(state.income, taxRate);
            
            if (state.cityData) {
                const results = calculateResults();
                updateUI(results);
            }
        });
    }

    // Listen for lifestyle changes from geo-currency.js
    document.addEventListener('nb-lifestyle-change', () => {
        if (state.cityData) {
            const results = calculateResults();
            updateUI(results);
        }
    });

    // Lead Magnet Capture
    const leadBtn = document.getElementById('send-guide-btn');
    const leadEmail = document.getElementById('lead-email');
    
    if (leadBtn && leadEmail) {
        leadBtn.addEventListener('click', async () => {
            const email = leadEmail.value.trim();
            
            if (!isValidEmail(email)) {
                showToast('Please enter a valid email address.', 'warning');
                return;
            }

            leadBtn.disabled = true;
            leadBtn.textContent = 'Sending...';

            try {
                // Simulate or hit capture API
                const response = await fetch('/api/capture-lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, source: 'home_lead_magnet' })
                });

                if (response.ok) {
                    showToast('Guide sent! Check your inbox.', 'success');
                    document.getElementById('lead-success')?.classList.remove('hidden');
                    leadEmail.value = '';
                } else {
                    throw new Error('Could not process request.');
                }
            } catch (e) {
                console.error('[Lead] Error:', e);
                showToast('Something went wrong. Please try again.', 'error');
            } finally {
                leadBtn.disabled = false;
                leadBtn.textContent = 'Send My Free Copy →';
            }
        });
    }
}

// ─── Core Logic ───
async function runCalculation() {
    if (state.isCalculating) return;
    
    const city = document.getElementById('calc-city').value;
    const income = Number.parseFloat(document.getElementById('calc-income').value);
    
    let currentCountry = 'United States';
    const nationalitySelect = document.getElementById('calc-nationality');
    if (nationalitySelect) {
        const val = nationalitySelect.value;
        if (val === 'UK') currentCountry = 'United Kingdom';
        else if (val === 'CA') currentCountry = 'Canada';
        else if (val === 'AU') currentCountry = 'Australia';
        else if (val === 'EU') currentCountry = 'Germany'; // default EU
    }

    if (!city || !income) {
        showError('Please enter both your income and target city.');
        return;
    }

    state.isCalculating = true;
    state.income = income;
    state.targetCity = city;
    state.currentCountry = currentCountry;

    // Show loading state
    const btnText = document.querySelector('#calculate-btn span');
    if (btnText) btnText.textContent = 'Analyzing...';

    try {
        const data = await getCityData(city);
        
        if (!data) {
            throw new Error(`Could not find data for "${city}"`);
        }

        state.cityData = data;
        state.targetCountry = data.country;
        
        const results = calculateResults();
        updateUI(results);
        
        // Show appropriate toast based on data quality
        if (data.country === 'Unknown') {
            showToast(`Using estimated data for ${city}. Results may be approximate.`, 'warning');
        } else {
            showToast(`Analyzed ${city} successfully!`, 'success');
        }

        // Track Event
        if (globalThis.gtag) {
            globalThis.gtag('event', 'calculator_use', {
                'city': city,
                'income': income,
                'country': data.country
            });
        }

    } catch (e) {
        showError(e.message);
    } finally {
        state.isCalculating = false;
        if (btnText) btnText.textContent = 'Calculate My Aura';
    }
}

function calculateResults() {
    const { cityData, income, currentCountry, targetCountry } = state;
    
    // 1. Tax Logic
    const currentTax = calculateNetIncome(income, currentCountry);
    const targetTax = calculateNetIncome(income, targetCountry);
    const taxSavings = Math.max(0, currentTax.taxAmount - targetTax.taxAmount);
    
    // 2. COL Logic (Estimates based on population/area if Ninjas doesn't provide explicit COL)
    // In a real app, we'd use a dedicated COL API or local database
    const baseCOL = 2500; // Average nomad monthly cost
    const densityFactor = cityData.population ? Math.log10(cityData.population) / 7 : 1;
    const colIndex = 100 * densityFactor; // Mock index
    
    const geo = globalThis.__NB_GEO__ || { getTier: () => 'comfort' };
    const tier = geo.getTier();
    const tierMultiplier = { budget: 0.75, comfort: 1, luxury: 2 }[tier];
    
    const monthlyCost = baseCOL * densityFactor * tierMultiplier;
    
    // 3. Savings
    const monthlyNet = targetTax.net / 12;
    const monthlySavings = monthlyNet - monthlyCost;
    
    // 4. Visa & ROI
    const visa = getVisaInfo(targetCountry);
    const roiMonths = calculateVisaROI(taxSavings, visa.cost);

    return {
        ...targetTax,
        monthlyNet,
        monthlyCost,
        monthlySavings,
        taxSavings,
        colIndex,
        visa,
        roiMonths,
        currentTaxRate: currentTax.taxRate
    };
}

// ─── UI Updates ───
function updateResultPanels() {
    const resultsPanel = document.getElementById('results-panel');
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.classList.add('hidden');
    if (resultsPanel) resultsPanel.classList.remove('hidden');
}

function updateMainResultValues(data) {
    const netMonthlyEl = document.getElementById('res-net-monthly');
    const taxRateEl = document.getElementById('res-tax-rate');
    const colIndexEl = document.getElementById('res-col-index');
    const savingsEl = document.getElementById('res-savings');

    if (netMonthlyEl) netMonthlyEl.textContent = formatCurrency(data.monthlyNet);
    if (taxRateEl) taxRateEl.textContent = formatPercent(data.taxRate);
    
    if (colIndexEl) {
        let label = 'Low';
        if (data.colIndex > 80) label = 'High';
        else if (data.colIndex > 50) label = 'Medium';
        colIndexEl.textContent = label;
    }
    
    if (savingsEl) {
        savingsEl.textContent = formatCurrency(data.monthlySavings);
        savingsEl.style.color = data.monthlySavings > 0 ? 'var(--aura-primary)' : '#ef4444';
    }
}

function updateProReportData(data) {
    const proCityName = document.getElementById('pro-city-name');
    if (!proCityName) return;

    proCityName.textContent = state.targetCity || 'Selected City';
    
    const proCountryName = document.getElementById('pro-country-name');
    if (proCountryName) proCountryName.textContent = state.targetCountry || 'Selected Country';
    
    // Taxes (Mock breakdown of total tax)
    const localTax = document.getElementById('pro-local-tax');
    const seTax = document.getElementById('pro-se-tax');
    const usTax = document.getElementById('pro-us-tax');
    const totalTax = document.getElementById('pro-total-tax');

    if (localTax) localTax.textContent = formatCurrency(data.breakdown ? (data.breakdown.localTax / 12) : (data.taxAmount / 12 * 0.7)); 
    if (seTax) seTax.textContent = formatCurrency(data.breakdown ? (data.breakdown.seTax / 12) : (data.taxAmount / 12 * 0.3)); 
    if (usTax) usTax.textContent = formatCurrency(data.breakdown ? (data.breakdown.usTax / 12) : 0); 
    if (totalTax) totalTax.textContent = formatCurrency(data.taxAmount / 12);
    
    // COL Breakdown
    const proRent = document.getElementById('pro-rent');
    const proGroceries = document.getElementById('pro-groceries');
    const proCoworking = document.getElementById('pro-coworking');
    const proUtilities = document.getElementById('pro-utilities');
    const proTotalCol = document.getElementById('pro-total-col');

    if (proRent) proRent.textContent = formatCurrency(data.monthlyCost * 0.45);
    if (proGroceries) proGroceries.textContent = formatCurrency(data.monthlyCost * 0.25);
    if (proCoworking) proCoworking.textContent = formatCurrency(data.monthlyCost * 0.1);
    if (proUtilities) proUtilities.textContent = formatCurrency(data.monthlyCost * 0.2);
    if (proTotalCol) proTotalCol.textContent = formatCurrency(data.monthlyCost);
}

function updateUI(data) {
    updateResultPanels();
    updateMainResultValues(data);

    // Metrics
    const taxEffEl = document.getElementById('aura-tax-efficiency');
    const savPowerEl = document.getElementById('aura-savings-power');
    if (taxEffEl) taxEffEl.textContent = formatPercent(1 - data.taxRate);
    if (savPowerEl) savPowerEl.textContent = formatPercent(data.monthlySavings / data.monthlyNet);

    updateProReportData(data);

    // Score & Bars
    const score = calculateAuraScore(data);
    animateScore(score);
    updateMetricBars(data);
    updateCommentary(score, data);
    updateVisaCard(data);

    // ROI Logic
    const roiVal = document.getElementById('res-payback');
    if (roiVal) {
        roiVal.textContent = data.roiMonths ? `${data.roiMonths} Months` : 'Instant';
    }
    const roiSavings = document.getElementById('res-roi-savings');
    if (roiSavings) {
        roiSavings.textContent = data.taxSavings > 0 ? `Saves ${formatCurrency(data.taxSavings)}/yr` : 'No tax arbitrage';
    }

    // Scroll to results on mobile
    if (globalThis.innerWidth < 768) {
        const resultsPanel = document.getElementById('results-panel');
        if (resultsPanel) resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

function calculateAuraScore(data) {
    // 1. Base Variables
    // Use real metrics from Teleport (backend) if they exist, otherwise simulate
    const safetyIndex = data.safety_score ? (data.safety_score * 10) : Math.min(100, 50 + (data.colIndex * 0.3));
    const internetIndex = data.internet_score ? (data.internet_score * 10) : 85; 
    const walkabilityIndex = Math.max(40, 100 - (data.colIndex * 0.2)); 
    const communityIndex = data.monthlySavings > 0 ? 80 : 50;

    // Weights (Dynamic based on selected profile)
    let w_f = 0.4, w_i = 0.2, w_s = 0.2, w_c = 0.2; // Default (Executive)
    
    const profileEl = document.getElementById('calc-aura-profile');
    const profile = profileEl ? profileEl.value : 'executive';
    
    if (profile === 'bootstrapper') {
        w_f = 0.6; w_i = 0.2; w_s = 0.1; w_c = 0.1;
    } else if (profile === 'family') {
        w_f = 0.2; w_i = 0.1; w_s = 0.5; w_c = 0.2;
    } else {
        // executive
        w_f = 0.2; w_i = 0.4; w_s = 0.3; w_c = 0.1;
    }

    // Financial Efficiency Sub-Score
    const savingsRatio = Math.max(0, Math.min(data.monthlySavings / (data.monthlyNet * 0.4), 1)) * 100;
    const taxEfficiency = (1 - data.taxRate) * 100;
    const financialEfficiency = (savingsRatio * 0.6) + (taxEfficiency * 0.4);

    // The Custom Weighted Algorithm: A = (w_f * F_e) + (w_i * I_c) + (w_s * S_s) + (w_c * C_f)
    const score = (w_f * financialEfficiency) + (w_i * internetIndex) + (w_s * safetyIndex) + (w_c * communityIndex);
    
    return Math.round(score);
}

function updateCommentary(score, data) {
    const el = document.getElementById('aura-commentary');
    if (!el) return;

    let text = "";
    if (score > 80) text = `Absolute legend. Moving to ${state.targetCity} is a financial power move. You're saving ${formatCurrency(data.taxSavings)} in taxes and your savings rate is elite.`;
    else if (score > 60) text = `Solid choice. ${state.targetCity} offers a significant lifestyle upgrade. Your tax efficiency is high, leaving plenty for investments.`;
    else if (score > 40) text = `Balanced. It's a sustainable move, though your tax savings are modest. Great for culture, okay for capital.`;
    else text = `High friction. The tax burden or cost of living in ${state.targetCity} might eat into your nomad freedom. Consider a lower-tax alternative.`;

    el.textContent = text;
}

function updateVisaCard(data) {
    const link = document.getElementById('visa-cta');
    const card = document.getElementById('visa-roi-card');
    if (link) {
        link.href = data.visa.url;
        link.innerHTML = `Apply for ${state.targetCountry} Visa &rarr;`;
    }
    if (card) {
        if (data.taxSavings > 0) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    }
}

function showError(msg) {
    console.error('Nomad Error:', msg);
    showToast(msg, 'error');
}

// Expose for debugging if needed
globalThis.__NB_APP__ = { state, runCalculation };
