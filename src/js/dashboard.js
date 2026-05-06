/**
 * dashboard.js — Days Tracker Dashboard (v4.0)
 * Wires into days-tracker.js for multi-country residency monitoring
 */

async function initDashboard() {
    const user = window.Clerk?.user;
    if (!user) return;

    const email = user.primaryEmailAddress.emailAddress;
    let isPro = false;
    let cachedLogs = [];

    async function fetchLogs() {
        try {
            const token = await window.Clerk.session.getToken();
            const res = await fetch('/api/travel-logs', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': email 
                }
            });
            cachedLogs = await res.json();

            // Render the multi-country Days Tracker (from days-tracker.js)
            if (window.NB_DaysTracker) {
                window.NB_DaysTracker.renderDaysTracker(cachedLogs, isPro);
            }

            // Also render the travel timeline
            renderTimeline(cachedLogs);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    }

    async function checkSubscription() {
        try {
            const token = await window.Clerk.session.getToken();
            // Check for Pro via Clerk metadata
            const meta = user.publicMetadata || {};
            if (meta.plan === 'pro' || meta.plan === 'business') {
                isPro = true;
                document.body.classList.add('is-pro-tier');
            }

            // Check for Business tier API access
            const res = await fetch(`/api/v1/cities?page=1&limit=1`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': email 
                }
            });
            if (res.ok) {
                document.body.classList.add('is-business-tier');
                isPro = true;
            }
        } catch (err) {
            console.error('Failed to check subscription:', err);
        }
    }

    function renderTimeline(records) {
        const tripTimeline = document.querySelector('.trip-timeline');
        if (!tripTimeline) return;

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
        const getFlag = c => flagMap[c.toLowerCase()] || 'un';

        const sorted = [...records].sort((a, b) =>
            new Date(b.fields.EntryDate) - new Date(a.fields.EntryDate)
        );

        tripTimeline.innerHTML = '';
        sorted.forEach((record, index) => {
            const f = record.fields;
            const entry = new Date(f.EntryDate);
            const exit = f.ExitDate ? new Date(f.ExitDate) : null;
            const days = exit 
                ? Math.max(1, Math.ceil((exit - entry) / 864e5) + 1)
                : Math.max(1, Math.ceil((new Date() - entry) / 864e5) + 1);
            const isCurrent = !exit || exit >= new Date();
            const isLast = index === sorted.length - 1;

            const item = document.createElement('div');
            item.className = `trip-log-item${isCurrent ? ' active' : ''}`;
            item.innerHTML = `
                <div class="trip-status">
                    <div class="status-dot${isCurrent ? '' : ' dimmed'}"></div>
                    ${!isLast ? '<div class="status-line"></div>' : ''}
                </div>
                <div class="trip-info-card">
                    <div class="trip-meta">
                        <img src="https://flagcdn.com/w40/${getFlag(f.Country)}.png" alt="${f.Country}" class="mini-flag">
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

    // Run subscription check first, then fetch logs (so isPro is set)
    await checkSubscription();
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
