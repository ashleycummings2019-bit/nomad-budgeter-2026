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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('city')) {
        const city = urlParams.get('city');
        document.getElementById('target-city').value = city;
        runCalculation();
    }
});

async function preloadData() {
    try {
        const config = window.__NB_CONFIG__ || {};
        if (!config.exchangeRate) {
            console.warn('Exchange rate API key missing');
        }
        state.rates = await getExchangeRates(config.exchangeRate);
        console.log('✅ Rates preloaded');
    } catch (e) {
        console.warn('Preload failed:', e.message);
        showToast('Real-time currency data currently unavailable. Using cached rates.', 'warning');
    }
}

// ─── Event Listeners ───
function initEventListeners() {
    const calcBtn = document.getElementById('calc-btn');
    const incomeInput = document.getElementById('gross-income');
    const cityInput = document.getElementById('target-city');
    const incomeSlider = document.getElementById('income-slider');

    if (calcBtn) calcBtn.addEventListener('click', () => runCalculation());
    
    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') runCalculation();
        });
    }

    if (incomeInput) {
        incomeInput.addEventListener('input', debounce((e) => {
            state.income = parseFloat(e.target.value) || 0;
            if (state.cityData) updateCalculationsOnly();
        }, 500));
    }

    if (incomeSlider) {
        incomeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
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
    
    const city = document.getElementById('target-city').value;
    const income = parseFloat(document.getElementById('gross-income').value);
    const currentCountry = document.getElementById('current-country').value;

    if (!city || !income) {
        showError('Please enter both your income and target city.');
        return;
    }

    state.isCalculating = true;
    state.income = income;
    state.targetCity = city;
    state.currentCountry = currentCountry;

    // Show loading state
    const btnText = document.querySelector('#calc-btn span');
    if (btnText) btnText.textContent = 'Analyzing...';

    try {
        const config = window.__NB_CONFIG__ || {};
        if (!config.apiNinjas) {
            throw new Error('City API key is missing. Please check configuration.');
        }
        
        const data = await getCityData(city, config.apiNinjas);
        
        if (!data) {
            throw new Error(`Could not find data for "${city}"`);
        }

        state.cityData = data;
        state.targetCountry = data.country; // Ideally mapping code -> name if needed
        
        const results = calculateResults();
        updateUI(results);
        
        showToast(`Analyzed ${city} successfully!`, 'success');

        // Track Event
        if (window.gtag) {
            window.gtag('event', 'calculator_use', {
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
    
    const geo = window.__NB_GEO__ || { getTier: () => 'comfort' };
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
function updateUI(data) {
    const resultsPanel = document.getElementById('results-panel');
    const emptyState = document.getElementById('empty-state');
    
    if (emptyState) emptyState.classList.add('hidden');
    if (resultsPanel) resultsPanel.classList.remove('hidden');

    // Update Result Numbers
    document.getElementById('res-monthly-net').textContent = formatCurrency(data.monthlyNet);
    document.getElementById('res-monthly-col').textContent = formatCurrency(data.monthlyCost);
    document.getElementById('res-monthly-savings').textContent = formatCurrency(data.monthlySavings);
    document.getElementById('res-tax-savings').textContent = formatCurrency(data.taxSavings);
    
    // Savings Color
    const savingsEl = document.getElementById('res-monthly-savings');
    savingsEl.style.color = data.monthlySavings > 0 ? 'var(--aura-primary)' : '#ef4444';

    // Metrics
    document.getElementById('aura-tax-efficiency').textContent = formatPercent(1 - data.taxRate);
    document.getElementById('aura-savings-power').textContent = formatPercent(data.monthlySavings / data.monthlyNet);

    // Score & Bars
    const score = calculateAuraScore(data);
    animateScore(score);
    updateMetricBars(data);
    updateCommentary(score, data);
    updateVisaCard(data);

    // ROI Logic
    const roiVal = document.getElementById('roi-value');
    if (roiVal) {
        roiVal.textContent = data.roiMonths ? `${data.roiMonths} Months` : 'Instant';
    }

    // Scroll to results on mobile
    if (window.innerWidth < 768) {
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

function calculateAuraScore(data) {
    const savingsRatio = Math.max(0, Math.min(data.monthlySavings / (data.monthlyNet * 0.4), 1));
    const taxEfficiency = 1 - data.taxRate;
    const colHealth = 1 - Math.min(data.colIndex / 150, 1);
    
    const score = (savingsRatio * 40) + (taxEfficiency * 30) + (colHealth * 30);
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
    const link = document.getElementById('visa-link');
    if (link) {
        link.href = data.visa.url;
        link.innerHTML = `Get My ${state.targetCountry} Visa <i class="fas fa-arrow-right"></i>`;
    }
}

function showError(msg) {
    console.error('Nomad Error:', msg);
    showToast(msg, 'error');
}

// Expose for debugging if needed
window.__NB_APP__ = { state, runCalculation };
