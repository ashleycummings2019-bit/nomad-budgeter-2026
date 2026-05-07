// Time Machine Calculator Logic

class TimeMachine {
    constructor() {
        this.baseCities = {
            'london': { name: 'London', taxRate: 0.35, symbol: '£', col: 3800 },
            'new_york': { name: 'New York', taxRate: 0.35, symbol: '$', col: 4200 },
            'toronto': { name: 'Toronto', taxRate: 0.35, symbol: '$', col: 3200 },
            'sydney': { name: 'Sydney', taxRate: 0.30, symbol: '$', col: 3500 },
            'berlin': { name: 'Berlin', taxRate: 0.40, symbol: '€', col: 3000 },
            'amsterdam': { name: 'Amsterdam', taxRate: 0.37, symbol: '€', col: 3500 },
            'dublin': { name: 'Dublin', taxRate: 0.40, symbol: '€', col: 3400 }
        };

        this.chart = null;
        this.data = window.__CITIES_DATA__ || [];
        this.init();
    }

    init() {
        console.log('[TimeMachine] Initializing. Cities loaded:', this.data.length);

        var self = this;

        // Bind slider
        this.savingsSlider = document.getElementById('monthly-savings');
        this.savingsDisplay = document.getElementById('savings-display');
        
        if (this.savingsSlider) {
            this.savingsSlider.addEventListener('input', function(e) {
                var val = parseInt(e.target.value).toLocaleString();
                self.savingsDisplay.innerText = '$' + val;
            });
        }

        // Ensure Step 1 is visible
        var step1 = document.getElementById('step-1');
        if (step1) {
            step1.style.display = 'block';
        }

        // Wire up all buttons with proper event listeners
        var btnNext = document.getElementById('tm-btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', function() {
                console.log('[TimeMachine] Next button clicked');
                self.nextStep(2);
            });
        }

        var btnBack = document.getElementById('tm-btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', function() {
                console.log('[TimeMachine] Back button clicked');
                self.nextStep(1);
            });
        }

        var btnRun = document.getElementById('tm-btn-run');
        if (btnRun) {
            btnRun.addEventListener('click', function() {
                console.log('[TimeMachine] Run Simulator clicked');
                self.calculate();
            });
        }

        var btnShare = document.getElementById('tm-btn-share');
        if (btnShare) {
            btnShare.addEventListener('click', function() {
                console.log('[TimeMachine] Share clicked');
                self.shareResult();
            });
        }

        var btnLead = document.getElementById('tm-btn-lead');
        if (btnLead) {
            btnLead.addEventListener('click', function() {
                console.log('[TimeMachine] Get Matched clicked');
                self.captureLead();
            });
        }

        var btnReset = document.getElementById('tm-btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', function() {
                console.log('[TimeMachine] Start Over clicked');
                self.reset();
            });
        }

        console.log('[TimeMachine] All button handlers wired up');
    }

    nextStep(step) {
        console.log('[TimeMachine] Switching to step:', step);
        var allSteps = document.querySelectorAll('.tm-step');
        for (var i = 0; i < allSteps.length; i++) {
            allSteps[i].style.display = 'none';
        }
        var target = document.getElementById('step-' + step);
        if (target) {
            target.style.display = 'block';
        }
    }

    calculate() {
        console.log('[TimeMachine] Calculate triggered');
        
        // Show loading step
        this.nextStep('processing');
        
        var texts = [
            "Calculating 2026 tax treaties...",
            "Adjusting for local cost of living...",
            "Simulating compound interest..."
        ];
        
        var textEl = document.getElementById('loading-text');
        var idx = 0;
        
        var interval = setInterval(function() {
            idx++;
            if (idx < texts.length) {
                textEl.innerText = texts[idx];
            }
        }, 1000);

        var self = this;
        setTimeout(function() {
            clearInterval(interval);
            
            try {
                self.processData();
            } catch (err) {
                console.error('[TimeMachine] Error in processData:', err);
            }
            
            // Hide all form steps
            var allSteps = document.querySelectorAll('.tm-step');
            for (var i = 0; i < allSteps.length; i++) {
                allSteps[i].style.display = 'none';
            }
            
            // Also hide the input flow wrapper
            var inputFlow = document.getElementById('tm-input-flow');
            if (inputFlow) inputFlow.style.display = 'none';
            
            // Show the output
            var output = document.getElementById('tm-output');
            if (output) {
                output.style.display = 'block';
                console.log('[TimeMachine] Output displayed');
            } else {
                console.error('[TimeMachine] tm-output element not found!');
            }
        }, 3000);
    }

    processData() {
        // 1. Gather Inputs
        var currentCityKey = document.getElementById('current-city').value;
        var income = parseFloat(document.getElementById('annual-income').value);
        var currentMonthlySavings = parseFloat(document.getElementById('monthly-savings').value);
        var destCitySlug = document.getElementById('destination-city').value;
        var lifestyleEl = document.querySelector('input[name="lifestyle"]:checked');
        var lifestyle = lifestyleEl ? lifestyleEl.value : 'standard';
        
        console.log('[TimeMachine] Inputs:', { currentCityKey, income, currentMonthlySavings, destCitySlug, lifestyle });

        var baseCity = this.baseCities[currentCityKey];
        if (!baseCity) {
            console.error('[TimeMachine] Base city not found:', currentCityKey);
            return;
        }
        
        var destCity = null;
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].slug === destCitySlug) {
                destCity = this.data[i];
                break;
            }
        }
        if (!destCity) destCity = this.data[0];
        
        console.log('[TimeMachine] Dest city:', destCity.name, 'Tax:', destCity.tax, 'COL:', destCity.col, 'Rent:', destCity.rent);

        // 2. Base Math
        var currentAnnualSavings = currentMonthlySavings * 12;
        var currentAnnualTax = income * baseCity.taxRate;
        var currentAnnualBurn = income - currentAnnualTax - currentAnnualSavings;

        // 3. Target Math
        var destTaxRate = destCity.tax !== undefined ? destCity.tax : 0.15;
        var destAnnualTax = income * destTaxRate;
        
        var multiplier = 1;
        if (lifestyle === 'budget') multiplier = 0.6;
        if (lifestyle === 'luxury') multiplier = 1.8;
        
        var destMonthlyBurn = ((destCity.rent || 1000) + (destCity.col || 1000)) * multiplier;
        var destAnnualBurn = destMonthlyBurn * 12;

        var newAnnualSavings = income - destAnnualTax - destAnnualBurn;

        // Deltas
        var taxSavings = currentAnnualTax - destAnnualTax;
        var colSavings = currentAnnualBurn - destAnnualBurn;
        
        // Compound Interest (10 years at 7%)
        var r = 0.07;
        var n = 10;
        var extraAnnualSavings = Math.max(0, taxSavings + colSavings);
        var compoundExtra = extraAnnualSavings * ((Math.pow(1 + r, n) - 1) / r);

        // FIRE Math (Target = 25x current burn)
        var targetWealth = Math.max(currentAnnualBurn, 30000) * 25; // min floor of 30k
        
        var getYearsToTarget = function(savings) {
            if (savings <= 0) return 99;
            var years = Math.log((targetWealth * r) / savings + 1) / Math.log(1 + r);
            return Math.min(years, 99);
        };

        var currentYears = getYearsToTarget(currentAnnualSavings);
        var newYears = getYearsToTarget(Math.max(newAnnualSavings, 0));
        
        var yearsSaved = currentYears - newYears;
        if (yearsSaved < 0) yearsSaved = 0;
        if (currentYears >= 99) yearsSaved = 20; // Marketing hook

        var ySaved = Math.floor(yearsSaved);
        var mSaved = Math.round((yearsSaved - ySaved) * 12);

        console.log('[TimeMachine] Results:', { yearsSaved: ySaved, monthsSaved: mSaved, compoundExtra: compoundExtra });

        // 4. Update UI
        document.getElementById('out-dest').innerText = destCity.name;
        document.getElementById('out-years').innerText = ySaved;
        document.getElementById('out-months').innerText = mSaved;
        
        document.getElementById('out-current-tax').innerText = Math.round(baseCity.taxRate * 100) + '%';
        document.getElementById('out-new-tax').innerText = Math.round(destTaxRate * 100) + '%';
        document.getElementById('out-tax-delta').innerText = '+$' + Math.round(taxSavings).toLocaleString() + '/year';
        
        document.getElementById('out-current-burn').innerText = '$' + Math.round(currentAnnualBurn / 12).toLocaleString() + '/mo';
        document.getElementById('out-new-burn').innerText = '$' + Math.round(destMonthlyBurn).toLocaleString() + '/mo';
        document.getElementById('out-col-delta').innerText = '+$' + Math.round(colSavings).toLocaleString() + '/year';
        
        document.getElementById('out-compound').innerText = '$' + Math.round(compoundExtra).toLocaleString();
        
        document.getElementById('cta-dest-name').innerText = destCity.name;

        // Update URL state for sharing
        try {
            var urlParams = new URLSearchParams(window.location.search);
            urlParams.set('from', currentCityKey);
            urlParams.set('to', destCitySlug);
            urlParams.set('income', income);
            window.history.replaceState({}, '', window.location.pathname + '?' + urlParams.toString());
        } catch(e) {
            console.warn('[TimeMachine] Could not update URL:', e);
        }

        this.renderChart(currentAnnualSavings, newAnnualSavings, r);
    }

    renderChart(currentSavings, newSavings, rate) {
        var canvas = document.getElementById('wealthChart');
        if (!canvas) {
            console.error('[TimeMachine] Canvas element not found');
            return;
        }
        var ctx = canvas.getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        var years = [];
        for (var i = 0; i <= 15; i++) years.push(i);
        
        var calcGrowth = function(savings, t) {
            if (t === 0) return 0;
            if (savings <= 0) return 0;
            return savings * ((Math.pow(1 + rate, t) - 1) / rate);
        };

        var dataCurrent = years.map(function(y) { return calcGrowth(currentSavings, y); });
        var dataNew = years.map(function(y) { return calcGrowth(Math.max(newSavings, 0), y); });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years.map(function(y) { return 'Year ' + y; }),
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
                                var label = context.dataset.label || '';
                                if (label) label += ': ';
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
        
        console.log('[TimeMachine] Chart rendered');
    }

    shareResult() {
        var dest = document.getElementById('out-dest').innerText;
        var years = document.getElementById('out-years').innerText;
        
        var text = 'I just shaved ' + years + ' years off my retirement by swapping my city for ' + dest + '. Calculate your Nomad Wealth Gap at NomadBudgeter.com';
        var url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Wealth Trajectory',
                text: text,
                url: url
            }).catch(function(err) { console.error(err); });
        } else {
            navigator.clipboard.writeText(text + '\n\n' + url).then(function() {
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
        var inputFlow = document.getElementById('tm-input-flow');
        if (inputFlow) inputFlow.style.display = 'block';
        this.nextStep(1);
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.timeMachine = new TimeMachine();
        checkUrlParams();
    });
} else {
    window.timeMachine = new TimeMachine();
    checkUrlParams();
}

function checkUrlParams() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('from') && urlParams.has('to')) {
        var from = urlParams.get('from');
        var to = urlParams.get('to');
        var income = urlParams.get('income');
        
        var currentCityEl = document.getElementById('current-city');
        var destCityEl = document.getElementById('destination-city');
        var incomeEl = document.getElementById('annual-income');
        
        if (currentCityEl) currentCityEl.value = from;
        if (destCityEl) destCityEl.value = to;
        if (incomeEl && income) incomeEl.value = income;
        
        // Auto run
        window.timeMachine.calculate();
    }
}
