/**
 * Nomad Budgeter | Financial Logic (v3.0 — Unified Data Architecture)
 * Single source of truth: /api/cities.json (built from src/_data/cities.json)
 *
 * API keys are injected at build time via window.__NB_CONFIG__
 * (set in base.njk from 11ty environment data).
 * Fallback keys are provided for local dev only.
 */

const API_KEYS = {
    exchangeRate: (window.__NB_CONFIG__?.exchangeRate) || '4fee8fc6019902b0118cd93b',
    apiNinjas: (window.__NB_CONFIG__?.apiNinjas) || 'w6V4eBiDD9LbVmMTaKevQ5BWZIH350AKg1AoGBYt'
};

class NomadBudgeterCalculator {
    constructor() {
        this.cachedRates = null;
        this.cityDataMap = null;
        this.fallbackRates = { "USD": 1, "EUR": 0.92, "AED": 3.67, "IDR": 15800, "GBP": 0.79, "THB": 36.5, "MXN": 17.1 };
        this.userEmail = "";
        this.initEventListeners();
        this.fetchCurrencyRates();
        this.loadCityDatabase();
        this.checkProStatus();
    }

    checkProStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true' || localStorage.getItem('nb_pro_unlocked') === 'true') {
            this.isPro = true;
            localStorage.setItem('nb_pro_unlocked', 'true');
        } else {
            this.isPro = false;
        }
    }

    // ─── Data Loading ───

    async loadCityDatabase() {
        if (this.cityDataMap) return;
        try {
            const res = await fetch('/api/cities.json');
            const data = await res.json();
            this.cityDataMap = {};
            data.forEach(city => {
                const slug = city.slug.toLowerCase().trim();
                const name = city.name.toLowerCase().trim();
                // Index by both slug and display name for flexible lookups
                this.cityDataMap[slug] = city;
                this.cityDataMap[name] = city;
                // Also index by country slug for comparison pages
                if (city.countrySlug && !this.cityDataMap[city.countrySlug]) {
                    this.cityDataMap[city.countrySlug] = city;
                }
            });
        } catch (e) {
            console.warn("City database load failed, using inline fallback:", e.message);
        }
    }

    // ─── Event Listeners ───

    initEventListeners() {
        const btn = document.getElementById('calculate-btn');
        if (btn) btn.addEventListener('click', () => this.handleCalculation());
        
        const compBtn = document.getElementById('compare-btn');
        if (compBtn) compBtn.addEventListener('click', () => this.handleComparison());

        const daysInput = document.getElementById('days-in-country');
        if (daysInput) {
            daysInput.addEventListener('input', (e) => {
                const days = parseInt(e.target.value, 10);
                const daysValEl = document.getElementById('days-val');
                if (daysValEl) daysValEl.innerText = `${days} days`;
                const warning = document.getElementById('residency-warning');
                if (warning) warning.style.display = days > 183 ? 'block' : 'none';
            });
        }

        const sendGuideBtn = document.getElementById('send-guide-btn');
        if (sendGuideBtn) {
            sendGuideBtn.addEventListener('click', () => this.handleLeadCapture());
        }

        const unlockProBtn = document.getElementById('unlock-pro-btn');
        if (unlockProBtn) {
            unlockProBtn.addEventListener('click', () => this.handleProUnlock());
        }

        const headerGoProBtn = document.getElementById('header-go-pro');
        if (headerGoProBtn) {
            headerGoProBtn.addEventListener('click', (e) => this.handleProUnlock(e));
        }

        this.startTrustSignalPulse();
        this.checkUrlParams();
    }

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const income = params.get('income');
        const loc = params.get('location');
        if (income && loc) {
            const incomeInput = document.getElementById('income');
            const locInput = document.getElementById('location');
            if (incomeInput) incomeInput.value = income;
            if (locInput) locInput.value = loc;
            
            const expInput = document.getElementById('expenses');
            const daysInput = document.getElementById('days-in-country');
            const usInput = document.getElementById('us-citizen');
            
            if (expInput && params.get('expenses')) expInput.value = params.get('expenses');
            if (daysInput && params.get('days')) daysInput.value = params.get('days');
            if (usInput && params.get('us')) usInput.value = params.get('us');
            
            // Auto-calculate after a short delay for DB load
            setTimeout(() => this.handleCalculation(), 500);
        }
    }

    handleShare() {
        const income = document.getElementById('income')?.value || "";
        const loc = document.getElementById('location')?.value || "";
        const expenses = document.getElementById('expenses')?.value || "";
        const days = document.getElementById('days-in-country')?.value || "";
        const us = document.getElementById('us-citizen')?.value || "";

        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?income=${income}&location=${encodeURIComponent(loc)}&expenses=${expenses}&days=${days}&us=${us}`;

        if (navigator.share) {
            navigator.share({
                title: 'My Nomad Budget',
                text: `Check out my cost of living and tax breakdown for ${loc}!`,
                url: shareUrl
            }).catch(() => {
                this.copyToClipboard(shareUrl);
            });
        } else {
            this.copyToClipboard(shareUrl);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('share-results-btn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Link Copied!';
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
            }
        });
    }

    startTrustSignalPulse() {
        const signalEl = document.getElementById('trust-signal');
        if (!signalEl) return;
        
        setInterval(() => {
            const current = parseInt(signalEl.innerText, 10);
            const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            signalEl.innerText = Math.max(12, current + change);
        }, 8000);
    }

    handleProUnlock(e) {
        if (e) e.preventDefault();


        const cityBadge = document.getElementById('city-badge');
        const city = cityBadge?.innerText || "Global";
        const price = 19;
        
        // Track conversion event
        if (typeof gtag === 'function') {
            gtag('event', 'begin_checkout', {
                currency: 'USD',
                value: price,
                items: [{ item_name: `Pro Report - ${city}`, price: price }]
            });
        }
        
        const btn = e?.target || document.getElementById('unlock-pro-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = "Redirecting to Secure Checkout...";
            btn.style.opacity = "0.7";
            btn.style.pointerEvents = "none";
            
            setTimeout(() => {
                // IMPORTANT: Replace this with your actual Live Stripe Payment Link
                const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/00wdR3aQeg521HXgzleAg0b';
                
                const stripeUrl = new URL(STRIPE_PAYMENT_LINK);
                if (this.userEmail) stripeUrl.searchParams.append('prefilled_email', this.userEmail);
                stripeUrl.searchParams.append('client_reference_id', `pro_report_${city.replace(/\s+/g, '_')}`);
                
                // Redirect user to Stripe
                window.location.href = stripeUrl.toString();
                
                // Reset button state (in case user hits 'back' in browser)
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.opacity = "1";
                    btn.style.pointerEvents = "auto";
                }, 2000);
            }, 500);
        }
    }

    async handleLeadCapture() {
        const emailInput = document.getElementById('lead-email');
        const successEl = document.getElementById('lead-success');
        const btn = document.getElementById('send-guide-btn');

        if (!emailInput || !emailInput.value.includes('@')) {
            alert("Please enter a valid email address.");
            return;
        }

        const capturedEmail = emailInput.value.trim();
        this.userEmail = capturedEmail;
        btn.disabled = true;
        btn.innerText = "Sending...";

        try {
            const response = await fetch('/api/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: capturedEmail, source: 'Nomad Budgeter 2026 Guide' })
            });

            if (!response.ok) throw new Error('Capture failed');

            if (successEl) successEl.classList.remove('hidden');
            emailInput.value = "";
            btn.innerText = "Guide Sent!";
            
            // Tracking event
            console.log("Lead captured:", capturedEmail);
            if (typeof gtag === 'function') {
                gtag('event', 'lead_capture', { method: 'tax_guide_pdf', email_domain: capturedEmail.split('@')[1] });
            }
        } catch (error) {
            console.error("Lead capture failed:", error);
            alert("Sorry, there was an issue sending your guide. Please try again or contact support.");
            btn.disabled = false;
            btn.innerText = "Send My Free Copy →";
        }
    }

    // ─── Network Helpers ───

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

    // ─── Core Calculation ───

    async handleCalculation() {
        try {
            const income = parseFloat(document.getElementById('income').value);
            const cityInput = document.getElementById('location').value.toLowerCase().trim();
            const userExpenses = parseFloat(document.getElementById('expenses').value) || 0;
            const daysInCountry = parseInt(document.getElementById('days-in-country')?.value || 365, 10);
            const isUsCitizen = document.getElementById('us-citizen')?.value === 'yes';
            const empType = document.getElementById('employment-type')?.value || 'freelancer';

            if (!income || !cityInput) {
                alert("Please enter details.");
                return;
            }

            this.toggleLoading(true);

            // Ensure city database is loaded before proceeding
            await this.loadCityDatabase();

            // Run API calls in parallel, but handle their failures individually
            const [rates, cityDataAPI] = await Promise.all([
                this.fetchCurrencyRates().catch(() => this.fallbackRates),
                this.fetchCityData(cityInput).catch(() => null)
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

            // Tax API is often the bottleneck, handle failure gracefully
            const taxData = await this.fetchIncomeTax(income, countryCode).catch(() => null);

            // Look up from unified city database
            const localFallback = this.cityDataMap
                ? (this.cityDataMap[cityInput] || this.cityDataMap[cityInput.replace(/\s+/g, '-')])
                : null;
            
            let effectiveTaxRate = 0.25; // Global average fallback
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

            const scoreBase = localFallback ? (localFallback.score_base || localFallback.score || 75) : 75;

            // Artificial delay for "calculating" feel
            await new Promise(resolve => setTimeout(resolve, 600));

            const finalData = {
                country: countryName,
                tax: effectiveTaxRate,
                col: monthlyCol,
                score_base: scoreBase,
                daysInCountry,
                isUsCitizen,
                empType
            };

            this.updateUI(income, actualCityName, finalData, userExpenses);
        } catch (globalError) {
            console.error("Calculation Failure:", globalError);
            alert("Calculation error. Please try a different city or check your connection.");
        } finally {
            this.toggleLoading(false);
        }
    }
    
    // ─── Comparison Logic ───

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

        if (!this.cityDataMap) return;

        const destA = this.cityDataMap[destAId];
        const destB = this.cityDataMap[destBId];

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

    // ─── Formatting Helpers ───

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

    // ─── UI Rendering ───

    updateUI(grossAnnual, cityName, cityData, userExpenses) {
        const monthlyGross = grossAnnual / 12;
        
        // 1. Tax Residency Logic (183 Days)
        let paysLocalTax = cityData.daysInCountry > 183;
        let localTaxAmount = paysLocalTax ? (monthlyGross * cityData.tax) : 0;
        
        // 2. US Citizen Complexity (FEIE, FTC, SE Tax)
        let usTaxAmount = 0;
        let usFederalTax = 0;
        let seTax = 0;
        
        if (cityData.isUsCitizen) {
            const feieLimit = 132900; // 2026 FEIE limit
            let taxableUsIncome = Math.max(0, grossAnnual - feieLimit);
            
            // Estimate 24% US Federal Tax on excess income
            if (taxableUsIncome > 0) {
                usFederalTax = (taxableUsIncome * 0.24) / 12;
            }
            
            // SE Tax (15.3%) for freelancers - assuming no Totalization Agreement for simplicity here
            if (cityData.empType === 'freelancer') {
                seTax = (grossAnnual * 0.153) / 12;
            }
            
            // Foreign Tax Credit (FTC) - Local tax offsets US Federal tax (but not SE Tax)
            if (localTaxAmount > 0 && usFederalTax > 0) {
                let offset = Math.min(usFederalTax, localTaxAmount);
                usFederalTax -= offset;
            }
            
            usTaxAmount = usFederalTax + seTax;
        }

        const totalTaxAmount = localTaxAmount + usTaxAmount;
        const netMonthly = monthlyGross - totalTaxAmount;
        const totalExpenses = userExpenses > 0 ? userExpenses : cityData.col;
        const savings = netMonthly - totalExpenses;
        
        const taxRatePercent = monthlyGross > 0 ? ((totalTaxAmount / monthlyGross) * 100).toFixed(1) : 0;
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
        this.updateROILogic(grossAnnual, totalTaxAmount, cityData);
        this.updateProReport(cityName, cityData, localTaxAmount, usTaxAmount, totalTaxAmount, totalExpenses);
    }

    updateProReport(cityName, cityData, localTax, usTax, totalTax, totalExpenses) {
        const proReport = document.getElementById('pro-report-content');
        const upsell = document.getElementById('pro-upsell');

        if (!this.isPro) {
            if (proReport) proReport.classList.add('hidden');
            if (upsell) upsell.classList.remove('hidden');
            return;
        }

        if (proReport) proReport.classList.remove('hidden');
        if (upsell) upsell.classList.add('hidden');

        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        safeSet('pro-city-name', cityName);
        safeSet('pro-country-name', cityData.country || cityName);
        safeSet('pro-local-tax', this.formatCurrency(localTax));
        safeSet('pro-se-tax', this.formatCurrency(usTax > 0 ? usTax * 0.6 : 0)); // Simulated split
        safeSet('pro-us-tax', this.formatCurrency(usTax > 0 ? usTax * 0.4 : 0));
        safeSet('pro-total-tax', this.formatCurrency(totalTax));

        // Detailed COL (Simulated from base metrics)
        const rent = totalExpenses * 0.6;
        const food = totalExpenses * 0.2;
        const work = 250;
        const util = totalExpenses - rent - food - work;

        safeSet('pro-rent', this.formatCurrency(rent));
        safeSet('pro-groceries', this.formatCurrency(food));
        safeSet('pro-coworking', this.formatCurrency(work));
        safeSet('pro-utilities', this.formatCurrency(util));
        safeSet('pro-total-col', this.formatCurrency(totalExpenses));

        // Re-trigger reveal for new elements
        if (window.observeNewElements) {
            window.observeNewElements(proReport);
        }
    }

    updateROILogic(grossAnnual, totalTaxAmount, cityData) {
        const baselineTaxRate = 0.35; // Standard high-tax baseline (US/UK/EU)
        const baselineMonthlyTax = (grossAnnual * baselineTaxRate) / 12;
        const localMonthlyTax = totalTaxAmount;
        
        const monthlyTaxSavings = Math.max(0, baselineMonthlyTax - localMonthlyTax);
        const visaCost = cityData.visaCost || 2500; // Default fallback if not in data
        
        const roiEl = document.getElementById('visa-roi-card');
        const paybackEl = document.getElementById('res-payback');
        const savingsEl = document.getElementById('res-roi-savings');
        const ctaEl = document.getElementById('visa-cta');

        if (monthlyTaxSavings > 100) {
            const months = Math.ceil(visaCost / monthlyTaxSavings);
            if (roiEl) roiEl.classList.remove('hidden');
            if (paybackEl) paybackEl.innerText = `${months} Months`;
            if (savingsEl) savingsEl.innerText = this.formatCurrency(monthlyTaxSavings * 12) + " / yr";
            
            if (ctaEl) {
                const country = cityData.country || "this country";
                ctaEl.innerText = `Apply for ${country} Digital Nomad Visa →`;
                // Map countries to specific affiliate sub-pages if available
                const affiliateLinks = {
                    "Spain": "https://citizenremote.com/visas/spain-digital-nomad-visa/?ref=nomadbudgeter",
                    "Portugal": "https://citizenremote.com/visas/portugal-d7-visa/?ref=nomadbudgeter",
                    "UAE": "https://citizenremote.com/visas/dubai-remote-work-visa/?ref=nomadbudgeter",
                    "Mexico": "https://citizenremote.com/visas/mexico-temporary-resident-visa/?ref=nomadbudgeter"
                };
                if (affiliateLinks[country]) {
                    ctaEl.href = affiliateLinks[country];
                }
            }
        } else {
            if (roiEl) roiEl.classList.add('hidden');
        }
    }

    // ─── Dynamic Aura System ───

    animateScore(score) {
        const ring = document.getElementById('aura-ring');
        const val = document.getElementById('aura-value');
        if (!ring || !val) return;

        // Dynamic color based on score tier
        let targetColor = '#8b5cf6'; // Default: Purple (Good)
        let glowColor = 'rgba(139, 92, 246, 0.25)';
        if (score >= 85) {
            targetColor = '#10b981'; // Green (Excellent)
            glowColor = 'rgba(16, 185, 129, 0.25)';
        } else if (score < 70) {
            targetColor = '#f59e0b'; // Orange (Warning)
            glowColor = 'rgba(245, 158, 11, 0.25)';
        }

        // Apply dynamic color to CSS custom property for cascade effect
        document.documentElement.style.setProperty('--aura-primary', targetColor);
        ring.style.boxShadow = `0 0 30px ${glowColor}`;
        
        let current = 0;
        const interval = setInterval(() => {
            if (current >= score) {
                clearInterval(interval);
            } else {
                current++;
                val.innerText = current;
                ring.style.background = `conic-gradient(${targetColor} ${current}%, transparent 0%)`;
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

    // --- Scroll Reveal Logic ---
    const isMobile = window.innerWidth <= 768;
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    // Function to observe elements safely
    const observeElement = (el) => {
        if (isMobile) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            return;
        }
        
        // Safety check: if element is already in view, show it immediately
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            return;
        }

        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        revealObserver.observe(el);
    };

    window.observeNewElements = (container) => {
        container.querySelectorAll('.metric-card, .stack-item, .upsell-panel, .hub-card, .glass-panel:not(.sidebar)').forEach(observeElement);
    };

    // Observe initial static elements
    document.querySelectorAll('.section-container, .glass-panel, .grid-3 > div, .grid-2 > div, .expert-analysis, .stack-item, .hub-card').forEach(observeElement);

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
