/**
 * dashboard.js — Logic for the Residency Monitor (v3.0)
 * Updated to work with the radial gauge + timeline UI
 */

async function initDashboard() {
    const user = window.Clerk?.user;
    if (!user) return;

    const email = user.primaryEmailAddress.emailAddress;

    // New selectors matching the viral dashboard overhaul
    const gaugeProgress = document.querySelector('.gauge-progress');
    const gaugeValue = document.querySelector('.gauge-value');
    const gaugeLabel = document.querySelector('.gauge-label');
    const insightPill = document.querySelector('.insight-pill');
    const warningText = document.querySelector('.stat-value.warning-text');
    const tripTimeline = document.querySelector('.trip-timeline');
    const locationName = document.querySelector('.location-name');
    const visaBadge = document.querySelector('.visa-badge');
    const premiumFlag = document.querySelector('.premium-flag');
    const taxSavingsEl = document.querySelector('.text-emerald');

    // Country -> flag code mapping
    const flagMap = {
        'portugal': 'pt', 'spain': 'es', 'united arab emirates': 'ae',
        'uae': 'ae', 'thailand': 'th', 'germany': 'de', 'france': 'fr',
        'italy': 'it', 'united kingdom': 'gb', 'uk': 'gb', 'japan': 'jp',
        'south korea': 'kr', 'mexico': 'mx', 'colombia': 'co',
        'brazil': 'br', 'indonesia': 'id', 'malaysia': 'my',
        'vietnam': 'vn', 'greece': 'gr', 'croatia': 'hr',
        'georgia': 'ge', 'turkey': 'tr', 'czechia': 'cz',
        'poland': 'pl', 'romania': 'ro', 'hungary': 'hu',
        'argentina': 'ar', 'chile': 'cl', 'peru': 'pe',
        'canada': 'ca', 'australia': 'au', 'new zealand': 'nz'
    };

    function getFlagCode(country) {
        return flagMap[country.toLowerCase()] || 'un';
    }

    async function fetchLogs() {
        try {
            const token = await window.Clerk.session.getToken();
            const res = await fetch('/api/travel-logs', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': email 
                }
            });
            const logs = await res.json();
            renderLogs(logs);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    }

    async function checkSubscription() {
        try {
            const token = await window.Clerk.session.getToken();
            const res = await fetch(`/api/v1/cities?page=1&limit=1`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': email 
                }
            });
            if (res.status === 403) {
                console.log('User is on Free/Pro Tier (No B2B API Access)');
            } else if (res.ok) {
                console.log('User is on Business Tier');
                document.body.classList.add('is-business-tier');
            }
        } catch (err) {
            console.error('Failed to check subscription:', err);
        }
    }

    function renderLogs(records) {
        const countryTotals = {};
        const sortedRecords = [...records].sort((a, b) => {
            return new Date(b.fields.EntryDate) - new Date(a.fields.EntryDate);
        });

        // Build country totals
        records.forEach(record => {
            const f = record.fields;
            const entry = new Date(f.EntryDate);
            const exit = f.ExitDate ? new Date(f.ExitDate) : new Date();
            const days = Math.max(1, Math.ceil((exit - entry) / (1000 * 60 * 60 * 24)) + 1);
            countryTotals[f.Country] = (countryTotals[f.Country] || 0) + days;
        });

        // Render trip timeline
        if (tripTimeline) {
            tripTimeline.innerHTML = '';
            sortedRecords.forEach((record, index) => {
                const f = record.fields;
                const entry = new Date(f.EntryDate);
                const exit = f.ExitDate ? new Date(f.ExitDate) : null;
                const days = exit 
                    ? Math.max(1, Math.ceil((exit - entry) / (1000 * 60 * 60 * 24)) + 1)
                    : Math.max(1, Math.ceil((new Date() - entry) / (1000 * 60 * 60 * 24)) + 1);
                const isCurrent = !exit || exit >= new Date();
                const flagCode = getFlagCode(f.Country);
                const isLast = index === sortedRecords.length - 1;

                const item = document.createElement('div');
                item.className = `trip-log-item${isCurrent ? ' active' : ''}`;
                item.innerHTML = `
                    <div class="trip-status">
                        <div class="status-dot${isCurrent ? '' : ' dimmed'}"></div>
                        ${!isLast ? '<div class="status-line"></div>' : ''}
                    </div>
                    <div class="trip-info-card">
                        <div class="trip-meta">
                            <img src="https://flagcdn.com/w40/${flagCode}.png" alt="${f.Country}" class="mini-flag">
                            <span class="trip-country">${f.Country}</span>
                            <span class="trip-badge${isCurrent ? ' current' : ''}">${isCurrent ? 'Current' : 'Completed'}</span>
                        </div>
                        <div class="trip-dates">
                            <span>${entry.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span class="date-arrow">&rarr;</span>
                            <span>${exit ? exit.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Present'}</span>
                        </div>
                        <div class="trip-days">${days} Days</div>
                    </div>
                `;
                tripTimeline.appendChild(item);
            });
        }

        // Update gauge with the top country
        const maxCountry = Object.entries(countryTotals).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
        updateGauge(maxCountry[1], maxCountry[0]);
    }

    function updateGauge(totalDays, countryName) {
        const threshold = 183;
        const circumference = 2 * Math.PI * 45; // r=45 from SVG
        const fraction = Math.min(totalDays / threshold, 1);
        const dashLength = fraction * circumference;
        const dashGap = circumference - dashLength;

        // Animate gauge ring
        if (gaugeProgress) {
            gaugeProgress.style.strokeDasharray = `${dashLength}, ${dashGap}`;
        }

        // Update center number
        if (gaugeValue) gaugeValue.textContent = totalDays;
        if (gaugeLabel) gaugeLabel.textContent = 'Days';

        // Update remaining days
        const remaining = Math.max(0, threshold - totalDays);
        if (warningText) {
            warningText.textContent = `${remaining} Days`;
            if (remaining <= 30) {
                warningText.style.color = '#ef4444';
            } else if (remaining <= 60) {
                warningText.style.color = '#f59e0b';
            }
        }

        // Update insight pill
        if (insightPill) {
            if (remaining > 0) {
                insightPill.innerHTML = `⚠️ Resident status triggered in <strong>${remaining} days</strong>`;
            } else {
                insightPill.innerHTML = `🚨 <strong>THRESHOLD REACHED</strong>. You are likely a tax resident.`;
                insightPill.style.background = 'rgba(239, 68, 68, 0.1)';
                insightPill.style.color = '#ef4444';
                insightPill.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }
        }

        // Update location display if we have a top country
        if (countryName && countryName !== 'None') {
            const flagCode = getFlagCode(countryName);
            if (locationName) locationName.textContent = countryName;
            if (premiumFlag) {
                premiumFlag.src = `https://flagcdn.com/w80/${flagCode}.png`;
                premiumFlag.alt = countryName;
            }
        }
    }

    // Initial checks
    checkSubscription();
    fetchLogs();

    // ─── Modal Logic ───
    const modal = document.getElementById('add-trip-modal');
    const openBtn = document.getElementById('btn-open-modal');
    const closeBtn = modal?.querySelector('.btn-close');
    const form = document.getElementById('add-trip-form');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('open');
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('open');
        });
    }

    // Close on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('open')) {
            modal.classList.remove('open');
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const country = document.getElementById('trip-country').value;
            const entryDate = document.getElementById('trip-entry').value;
            const exitDate = document.getElementById('trip-exit').value;

            if (!country || !entryDate || !exitDate) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            try {
                const token = await window.Clerk.session.getToken();
                const res = await fetch('/api/travel-logs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-user-email': email
                    },
                    body: JSON.stringify({ country, entryDate, exitDate })
                });
                if (res.ok) {
                    modal.classList.remove('open');
                    form.reset();
                    fetchLogs();
                } else {
                    alert('Error saving trip. Please try again.');
                }
            } catch (err) {
                console.error('Submit error:', err);
                alert('Connection error. Please check your internet and try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Log Entry';
                }
            }
        });
    }

    // ─── "Generate Full Report" Button ───
    const reportBtn = document.querySelector('.btn-shimmer');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            // Navigate to the main calculator page with report anchor
            window.location.href = '/#results-panel';
        });
    }

    // ─── Mouse Tracking Glow on Cards ───
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
            const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

// Initialize when Clerk is ready
if (window.Clerk) {
    if (window.Clerk.user) {
        initDashboard();
    } else {
        window.Clerk.addListener(({ user }) => {
            if (user) initDashboard();
        });
    }
}
