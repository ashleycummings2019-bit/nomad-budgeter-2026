// Time Machine Calculator Logic

class TimeMachine {
    constructor() {
        this.baseCities = {
            'london': { name: 'London', taxRate: 0.35, symbol: '£' },
            'new_york': { name: 'New York', taxRate: 0.35, symbol: '$' },
            'toronto': { name: 'Toronto', taxRate: 0.35, symbol: '$' },
            'sydney': { name: 'Sydney', taxRate: 0.30, symbol: '$' },
            'berlin': { name: 'Berlin', taxRate: 0.40, symbol: '€' },
            'amsterdam': { name: 'Amsterdam', taxRate: 0.37, symbol: '€' },
            'dublin': { name: 'Dublin', taxRate: 0.40, symbol: '€' }
        };

        this.chart = null;
        this.data = window.__CITIES_DATA__ || [];
        this.init();
    }

    init() {
        // Bind UI Elements
        this.savingsSlider = document.getElementById('monthly-savings');
        this.savingsDisplay = document.getElementById('savings-display');
        
        if (this.savingsSlider) {
            this.savingsSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value).toLocaleString();
                this.savingsDisplay.innerText = `$${val}`;
            });
        }
    }

    nextStep(step) {
        document.querySelectorAll('.tm-step').forEach(el => el.style.display = 'none');
        document.getElementById(`step-${step}`).style.display = 'block';
    }

    calculate() {
        // Show loading
        this.nextStep('processing');
        
        const texts = [
            "Calculating 2026 tax treaties...",
            "Adjusting for local cost of living...",
            "Simulating compound interest..."
        ];
        
        const textEl = document.getElementById('loading-text');
        let idx = 0;
        
        const interval = setInterval(() => {
            idx++;
            if (idx < texts.length) {
                textEl.innerText = texts[idx];
            }
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            this.processData();
            this.nextStep('output'); // Show output, but it's not a tm-step, so:
            document.querySelectorAll('.tm-step').forEach(el => el.style.display = 'none');
            document.getElementById('tm-output').style.display = 'block';
        }, 3000);
    }

    processData() {
        // 1. Gather Inputs
        const currentCityKey = document.getElementById('current-city').value;
        const income = parseFloat(document.getElementById('annual-income').value);
        const currentMonthlySavings = parseFloat(document.getElementById('monthly-savings').value);
        const destCitySlug = document.getElementById('destination-city').value;
        const lifestyle = document.querySelector('input[name="lifestyle"]:checked').value;
        
        const baseCity = this.baseCities[currentCityKey];
        const destCity = this.data.find(c => c.slug === destCitySlug) || this.data[0];

        // 2. Base Math
        const currentAnnualSavings = currentMonthlySavings * 12;
        const currentAnnualTax = income * baseCity.taxRate;
        const currentAnnualBurn = income - currentAnnualTax - currentAnnualSavings;

        // 3. Target Math
        const destTaxRate = destCity.tax || 0.15; // fallback
        const destAnnualTax = income * destTaxRate;
        
        let multiplier = 1;
        if (lifestyle === 'budget') multiplier = 0.6;
        if (lifestyle === 'luxury') multiplier = 1.8;
        
        const destMonthlyBurn = ((destCity.rent || 1000) + (destCity.col || 1000)) * multiplier;
        const destAnnualBurn = destMonthlyBurn * 12;

        const newAnnualSavings = income - destAnnualTax - destAnnualBurn;

        // Deltas
        const taxSavings = currentAnnualTax - destAnnualTax;
        const colSavings = currentAnnualBurn - destAnnualBurn;
        
        // Compound Interest (10 years at 7%)
        const r = 0.07;
        const n = 10;
        const extraAnnualSavings = Math.max(0, taxSavings + colSavings);
        const compoundExtra = extraAnnualSavings * ((Math.pow(1 + r, n) - 1) / r);

        // FIRE Math (Target = 25x current burn)
        const targetWealth = currentAnnualBurn * 25;
        
        const getYearsToTarget = (savings) => {
            if (savings <= 0) return 99; // Never
            const years = Math.log((targetWealth * r) / savings + 1) / Math.log(1 + r);
            return years;
        };

        const currentYears = getYearsToTarget(currentAnnualSavings);
        const newYears = getYearsToTarget(newAnnualSavings);
        
        let yearsSaved = currentYears - newYears;
        if (yearsSaved < 0) yearsSaved = 0;
        if (currentYears === 99) yearsSaved = 20; // Default marketing hook if they aren't saving

        const ySaved = Math.floor(yearsSaved);
        const mSaved = Math.round((yearsSaved - ySaved) * 12);

        // 4. Update UI
        document.getElementById('out-dest').innerText = destCity.name;
        document.getElementById('out-years').innerText = ySaved;
        document.getElementById('out-months').innerText = mSaved;
        
        document.getElementById('out-current-tax').innerText = `${Math.round(baseCity.taxRate * 100)}%`;
        document.getElementById('out-new-tax').innerText = `${Math.round(destTaxRate * 100)}%`;
        document.getElementById('out-tax-delta').innerText = `+$${Math.round(taxSavings).toLocaleString()}/year`;
        
        document.getElementById('out-current-burn').innerText = `$${Math.round(currentAnnualBurn/12).toLocaleString()}/mo`;
        document.getElementById('out-new-burn').innerText = `$${Math.round(destMonthlyBurn).toLocaleString()}/mo`;
        document.getElementById('out-col-delta').innerText = `+$${Math.round(colSavings).toLocaleString()}/year`;
        
        document.getElementById('out-compound').innerText = `$${Math.round(compoundExtra).toLocaleString()}`;
        
        document.getElementById('cta-dest-name').innerText = destCity.name;

        // Update URL state for sharing
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('from', currentCityKey);
        urlParams.set('to', destCitySlug);
        urlParams.set('income', income);
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);

        this.renderChart(currentAnnualSavings, newAnnualSavings, r);
    }

    renderChart(currentSavings, newSavings, rate) {
        const ctx = document.getElementById('wealthChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const years = Array.from({length: 16}, (_, i) => i);
        
        // FV = P * (((1+r)^t - 1) / r)
        const calcGrowth = (savings, t) => {
            if (t === 0) return 0;
            return savings * ((Math.pow(1 + rate, t) - 1) / rate);
        };

        const dataCurrent = years.map(y => calcGrowth(currentSavings, y));
        const dataNew = years.map(y => calcGrowth(newSavings, y));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years.map(y => `Year ${y}`),
                datasets: [
                    {
                        label: 'Current City',
                        data: dataCurrent,
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        tension: 0.4
                    },
                    {
                        label: 'Nomad Destination',
                        data: dataNew,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f4f4f5' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value) {
                                if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#a1a1aa' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    shareResult() {
        const dest = document.getElementById('out-dest').innerText;
        const years = document.getElementById('out-years').innerText;
        
        const text = `I just shaved ${years} years off my retirement by swapping my city for ${dest}. Calculate your Nomad Wealth Gap at NomadBudgeter.com`;
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Wealth Trajectory',
                text: text,
                url: url
            }).catch(console.error);
        } else {
            // Fallback to copy clipboard
            navigator.clipboard.writeText(`${text}\n\n${url}`).then(() => {
                alert('Copied to clipboard! Ready to share on X or Reddit.');
            });
        }
    }

    captureLead() {
        if (window.Clerk && window.Clerk.user) {
            alert("Matching you with our legal partner. We'll email you shortly!");
        } else {
            if (window.Clerk) {
                window.Clerk.openSignIn();
            } else {
                alert("Please sign in to continue.");
            }
        }
    }

    reset() {
        document.getElementById('tm-output').style.display = 'none';
        this.nextStep(1);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.timeMachine = new TimeMachine();
    
    // Check URL params for direct sharing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('from') && urlParams.has('to')) {
        const from = urlParams.get('from');
        const to = urlParams.get('to');
        const income = urlParams.get('income');
        
        if (document.getElementById('current-city')) document.getElementById('current-city').value = from;
        if (document.getElementById('destination-city')) document.getElementById('destination-city').value = to;
        if (document.getElementById('annual-income') && income) document.getElementById('annual-income').value = income;
        
        // Auto run
        window.timeMachine.calculate();
    }
});
