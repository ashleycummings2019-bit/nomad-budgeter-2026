/**
 * swarm-feed.js — Controls the Agent Swarm Feed UI
 * Interacts with /api/swarm-findings
 */

async function initSwarmFeed() {
    const user = window.Clerk?.user;
    if (!user) return;

    const feedList = document.getElementById('swarm-feed-list');
    const filterStatus = document.getElementById('filter-status');
    const statPending = document.getElementById('stat-pending');
    const statAudited = document.getElementById('stat-audited');

    if (!feedList) return;

    let allFindings = [];

    async function fetchFindings() {
        try {
            const token = await window.Clerk.session.getToken();
            const res = await fetch('/api/swarm-findings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': user.primaryEmailAddress.emailAddress
                }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            allFindings = await res.json();
            renderFeed();
            updateStats();
        } catch (err) {
            console.error('Failed to fetch findings:', err);
            feedList.innerHTML = `
                <div class="loading-state">
                    <p style="color:#ef4444;">Failed to connect to swarm backend.</p>
                    <p class="text-dim" style="font-size:0.8rem;">${err.message}</p>
                </div>
            `;
        }
    }

    function updateStats() {
        const pending = allFindings.filter(f => f.status === 'pending').length;
        const auditedToday = allFindings.filter(f => {
            if (f.status === 'pending' || !f.reviewed_at) return false;
            return new Date(f.reviewed_at).toDateString() === new Date().toDateString();
        }).length;
        
        if (statPending) statPending.textContent = pending;
        if (statAudited) statAudited.textContent = auditedToday;
    }

    function renderFeed() {
        const statusFilter = filterStatus?.value || 'pending';
        const filtered = allFindings.filter(f => {
            if (statusFilter === 'all') return true;
            return f.status === statusFilter;
        });

        if (filtered.length === 0) {
            feedList.innerHTML = `<div class="loading-state"><p>No findings found matching "${statusFilter}".</p></div>`;
            return;
        }

        feedList.innerHTML = filtered.map(f => {
            const icon = f.finding_type === 'tax_change' ? '🏦' : f.finding_type === 'visa_change' ? '🛂' : '📈';
            const confidence = Math.round((f.confidence || 0) * 100);
            const isPending = f.status === 'pending';
            
            // Format values for display
            const formatValue = (val) => {
                if (typeof val === 'object' && val !== null) {
                    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
                }
                return val || 'N/A';
            };

            return `
                <div class="finding-card" id="finding-${f.id}">
                    <div class="finding-type-icon">${icon}</div>
                    <div class="finding-main">
                        <div class="finding-location">${f.country_slug}${f.city_slug ? ' / ' + f.city_slug : ''}</div>
                        <div class="finding-desc">${(f.finding_type || 'FINDING').replace(/_/g, ' ').toUpperCase()}</div>
                        <div class="finding-meta">
                            <span class="status-badge status-${f.status}">${f.status}</span>
                            <span class="confidence-tag">${confidence}% confidence</span>
                            ${f.source_url ? `<a href="${f.source_url}" target="_blank" class="text-dim" style="font-size:0.75rem;">Source ↗</a>` : ''}
                        </div>
                        <div class="finding-diff">
                            <div class="diff-old">Current: ${formatValue(f.current_value)}</div>
                            <div class="diff-new">Proposed: ${formatValue(f.proposed_value)}</div>
                        </div>
                    </div>
                    <div class="finding-actions">
                        ${isPending ? `
                            <button class="btn-approve" onclick="handleReview('${f.id}', 'approved')">Approve</button>
                            <button class="btn-reject" onclick="handleReview('${f.id}', 'rejected')">Reject</button>
                        ` : `
                            <div style="text-align:right;">
                                <div style="font-size:0.75rem; color:var(--text-dim);">Reviewed by</div>
                                <div style="font-size:0.8rem; font-weight:600;">${f.reviewed_by || 'system'}</div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.handleReview = async (id, status) => {
        const card = document.getElementById(`finding-${id}`);
        const actions = card.querySelector('.finding-actions');
        const originalContent = actions.innerHTML;
        
        actions.innerHTML = `<div class="aura-spinner-sm"></div>`;

        try {
            const token = await window.Clerk.session.getToken();
            const res = await fetch('/api/swarm-findings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-user-email': user.primaryEmailAddress.emailAddress
                },
                body: JSON.stringify({ id, status })
            });

            if (res.ok) {
                // Refresh local data
                const finding = allFindings.find(find => find.id === id);
                if (finding) {
                    finding.status = status;
                    finding.reviewed_by = user.primaryEmailAddress.emailAddress;
                    finding.reviewed_at = new Date().toISOString();
                }
                renderFeed();
                updateStats();
            } else {
                actions.innerHTML = originalContent;
                alert('Failed to update finding.');
            }
        } catch (err) {
            console.error('Review error:', err);
            actions.innerHTML = originalContent;
            alert('Connection error.');
        }
    };

    if (filterStatus) {
        filterStatus.addEventListener('change', renderFeed);
    }

    fetchFindings();
}

// Initialize when Clerk is ready
if (window.Clerk) {
    if (window.Clerk.user) {
        initSwarmFeed();
    } else {
        window.Clerk.addListener(({ user }) => {
            if (user) initSwarmFeed();
        });
    }
}
