/**
 * dashboard.js — Logic for the Residency Monitor
 */

async function initDashboard() {
    const user = window.Clerk?.user;
    if (!user) return;

    const email = user.primaryEmailAddress.emailAddress;
    const logList = document.querySelector('.history-table tbody');
    const stayCountEl = document.querySelector('.days-counter .count');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-header .percentage');
    const warningText = document.querySelector('.warning-text');

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
        if (!logList) return;
        
        const countryTotals = {};
        logList.innerHTML = '';

        records.forEach(record => {
            const f = record.fields;
            const entry = new Date(f.EntryDate);
            const exit = new Date(f.ExitDate);
            
            // Tax residency usually counts "any part of a day" as a full day
            const days = Math.max(1, Math.ceil((exit - entry) / (1000 * 60 * 60 * 24)) + 1);
            
            countryTotals[f.Country] = (countryTotals[f.Country] || 0) + days;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${f.Country}</td>
                <td>${entry.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${exit.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${days}</td>
            `;
            logList.appendChild(row);
        });

        const maxCountry = Object.entries(countryTotals).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
        updateProgress(maxCountry[1], maxCountry[0]);
    }

    function updateProgress(total, countryName) {
        if (stayCountEl) stayCountEl.innerText = total;
        
        const threshold = 183;
        const percent = Math.min(Math.round((total / threshold) * 100), 100);
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
            if (percent > 80) progressFill.style.backgroundColor = '#ef4444';
        }
        if (progressText) progressText.innerText = `${percent}%`;
        
        if (warningText) {
            const remaining = threshold - total;
            const countryLabel = countryName !== 'None' ? ` in ${countryName}` : '';
            if (remaining > 0) {
                warningText.innerHTML = `⚠️ <strong>${remaining} days remaining</strong>${countryLabel} until you trigger tax residency.`;
            } else {
                warningText.innerHTML = `🚨 <strong>THRESHOLD REACHED</strong>${countryLabel}. You are likely a tax resident.`;
                warningText.style.color = '#ef4444';
            }
        }
    }

    // Initial checks
    checkSubscription();
    fetchLogs();

    // Modal Logic
    const modal = document.getElementById('add-trip-modal');
    const openBtn = document.getElementById('btn-open-modal');
    const closeBtn = document.querySelector('.btn-close');
    const form = document.getElementById('add-trip-form');

    if (openBtn) {
        openBtn.onclick = () => modal.style.display = 'flex';
    }

    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const country = document.getElementById('trip-country').value;
            const entryDate = document.getElementById('trip-entry').value;
            const exitDate = document.getElementById('trip-exit').value;

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
                    modal.style.display = 'none';
                    form.reset();
                    fetchLogs();
                } else {
                    alert('Error saving trip. Please try again.');
                }
            } catch (err) {
                console.error('Submit error:', err);
            }
        };
    }
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
