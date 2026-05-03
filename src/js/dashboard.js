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
            const res = await fetch('/api/travel-logs', {
                headers: { 'x-user-email': email }
            });
            const logs = await res.json();
            renderLogs(logs);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    }

    async function checkSubscription() {
        try {
            const res = await fetch(`/api/v1/cities?page=1&limit=1`, {
                headers: { 'x-user-email': email }
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
        
        let totalDays = 0;
        logList.innerHTML = '';

        records.forEach(record => {
            const f = record.fields;
            const entry = new Date(f.EntryDate);
            const exit = new Date(f.ExitDate);
            const days = Math.ceil((exit - entry) / (1000 * 60 * 60 * 24));
            
            totalDays += days;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${f.Country}</td>
                <td>${entry.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                <td>${exit.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                <td>${days}</td>
            `;
            logList.appendChild(row);
        });

        updateProgress(totalDays);
    }

    function updateProgress(total) {
        if (stayCountEl) stayCountEl.innerText = total;
        
        const threshold = 183;
        const percent = Math.min(Math.round((total / threshold) * 100), 100);
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.innerText = `${percent}%`;
        
        if (warningText) {
            const remaining = threshold - total;
            if (remaining > 0) {
                warningText.innerHTML = `⚠️ <strong>${remaining} days remaining</strong> until you trigger tax residency.`;
            } else {
                warningText.innerHTML = `🚨 <strong>THRESHOLD REACHED</strong>. You are now a tax resident.`;
                warningText.style.color = '#ef4444';
            }
        }
    }

    // Initial checks
    checkSubscription();
    fetchLogs();

    // Add Trip Button (Modal or prompt for demo)
    const addTripBtn = document.querySelector('.btn-ghost-sm');
    if (addTripBtn) {
        addTripBtn.addEventListener('click', async () => {
            const country = prompt('Country:');
            const entryDate = prompt('Entry Date (YYYY-MM-DD):');
            const exitDate = prompt('Exit Date (YYYY-MM-DD):');

            if (country && entryDate && exitDate) {
                try {
                    const res = await fetch('/api/travel-logs', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-email': email
                        },
                        body: JSON.stringify({ country, entryDate, exitDate })
                    });
                    if (res.ok) {
                        fetchLogs(); // Refresh
                    }
                } catch (err) {
                    alert('Failed to save log');
                }
            }
        });
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
