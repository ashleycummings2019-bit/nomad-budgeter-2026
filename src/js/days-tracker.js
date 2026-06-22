/**
 * days-tracker.js — Multi-Country Days Tracker Engine
 * The retention centrepiece of Nomad Budgeter Pro.
 *
 * Free:  Simple day count per country
 * Pro:   Threshold warnings, colour-coded alerts, year-end projections
 */

// ─── Tax Residency Thresholds (days/calendar year) ───
const TAX_THRESHOLDS = {
  'portugal': 183, 'spain': 183, 'france': 183, 'germany': 183,
  'italy': 183, 'greece': 183, 'croatia': 183, 'united kingdom': 183,
  'netherlands': 183, 'ireland': 183, 'austria': 183, 'belgium': 183,
  'sweden': 183, 'denmark': 183, 'norway': 183, 'finland': 183,
  'switzerland': 183, 'czechia': 183, 'poland': 183, 'romania': 183,
  'hungary': 183, 'bulgaria': 183, 'estonia': 183, 'latvia': 183,
  'lithuania': 183, 'slovakia': 183, 'slovenia': 183, 'cyprus': 183,
  'malta': 183, 'luxembourg': 183,
  'thailand': 180, 'colombia': 183, 'mexico': 183, 'brazil': 183,
  'argentina': 183, 'chile': 183, 'peru': 183, 'costa rica': 183,
  'panama': 183, 'ecuador': 183, 'uruguay': 183, 'dominican republic': 183,
  'united arab emirates': 183, 'uae': 183, 'dubai': 183,
  'japan': 183, 'south korea': 183, 'singapore': 183, 'malaysia': 183,
  'indonesia': 183, 'vietnam': 183, 'philippines': 183,
  'canada': 183, 'australia': 183, 'new zealand': 183,
  'turkey': 183, 'georgia': 183, 'armenia': 183,
  'south africa': 183, 'kenya': 183, 'morocco': 183,
};

const THRESHOLD_DANGER = 30;
const THRESHOLD_WARNING = 60;

// Country → ISO flag code
const FLAG_MAP = {
  'portugal': 'pt', 'spain': 'es', 'france': 'fr', 'germany': 'de',
  'italy': 'it', 'greece': 'gr', 'croatia': 'hr', 'united kingdom': 'gb',
  'uk': 'gb', 'netherlands': 'nl', 'ireland': 'ie', 'austria': 'at',
  'belgium': 'be', 'sweden': 'se', 'denmark': 'dk', 'norway': 'no',
  'finland': 'fi', 'switzerland': 'ch', 'czechia': 'cz', 'poland': 'pl',
  'romania': 'ro', 'hungary': 'hu', 'bulgaria': 'bg', 'estonia': 'ee',
  'latvia': 'lv', 'lithuania': 'lt', 'slovakia': 'sk', 'slovenia': 'si',
  'cyprus': 'cy', 'malta': 'mt', 'luxembourg': 'lu',
  'thailand': 'th', 'colombia': 'co', 'mexico': 'mx', 'brazil': 'br',
  'argentina': 'ar', 'chile': 'cl', 'peru': 'pe', 'costa rica': 'cr',
  'panama': 'pa', 'ecuador': 'ec', 'uruguay': 'uy', 'dominican republic': 'do',
  'united arab emirates': 'ae', 'uae': 'ae', 'dubai': 'ae',
  'japan': 'jp', 'south korea': 'kr', 'singapore': 'sg', 'malaysia': 'my',
  'indonesia': 'id', 'vietnam': 'vn', 'philippines': 'ph',
  'canada': 'ca', 'australia': 'au', 'new zealand': 'nz',
  'turkey': 'tr', 'georgia': 'ge', 'armenia': 'am',
  'south africa': 'za', 'kenya': 'ke', 'morocco': 'ma',
};

function getFlagCode(country) {
  return FLAG_MAP[country.toLowerCase()] || 'un';
}

function getThreshold(country) {
  return TAX_THRESHOLDS[country.toLowerCase()] || 183;
}

/**
 * Compute per-country day totals from travel log records.
 * Returns sorted array: [{ country, days, threshold, pct, status, isCurrent }]
 */
function computeCountryTotals(records) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const totals = {};

  // Sort chronologically to identify current trip
  const sorted = [...records].sort((a, b) =>
    new Date(a.fields.EntryDate) - new Date(b.fields.EntryDate)
  );

  sorted.forEach(record => {
    const f = record.fields;
    const entry = new Date(f.EntryDate);
    const exit = f.ExitDate ? new Date(f.ExitDate) : now;
    const isCurrent = !f.ExitDate || new Date(f.ExitDate) >= now;

    // Only count days in current calendar year
    const countStart = entry < yearStart ? yearStart : entry;
    const countEnd = Math.min(exit, now);
    if (countStart > countEnd) return;

    const days = Math.max(1, Math.ceil((countEnd - countStart) / 864e5) + 1);
    const country = f.Country;

    if (!totals[country]) totals[country] = { days: 0, isCurrent: false };
    totals[country].days += days;
    if (isCurrent) {
      totals[country].isCurrent = true;
    }
  });

  return Object.entries(totals)
    .map(([country, { days, isCurrent }]) => {
      const threshold = getThreshold(country);
      const pct = Math.min(100, Math.round((days / threshold) * 100));
      let status = 'safe';          // green
      if (pct >= 100) status = 'exceeded';  // red
      else if (pct >= 82) status = 'danger';   // red pulse  (150+ of 183)
      else if (pct >= 65) status = 'warning';  // amber
      return { country, days, threshold, pct, status, isCurrent };
    })
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Project year-end days based on average daily rate (Pro only).
 */
function projectYearEnd(countryData) {
  const now = new Date();
  const dayOfYear = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 864e5);
  const daysRemaining = (isLeapYear(now.getFullYear()) ? 366 : 365) - dayOfYear;

  return countryData.map(c => {
    if (!c.isCurrent) return { ...c, projected: c.days };
    const dailyRate = c.days / dayOfYear;
    const projected = Math.round(c.days + (dailyRate * daysRemaining));
    return { ...c, projected };
  });
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ─── Status → colour mapping ───
const STATUS_COLORS = {
  safe:     { bar: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
  warning:  { bar: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  danger:   { bar: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
  exceeded: { bar: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
};

/**
 * Render the multi-country tracker into #tracker-grid.
 * @param {Array} records — raw Airtable travel log records
 * @param {boolean} isPro — whether user has Pro subscription
 */
function renderDaysTracker(records, isPro) {
  const grid = document.getElementById('tracker-grid');
  const summaryEl = document.getElementById('tracker-summary');
  if (!grid) return;

  let countryData = computeCountryTotals(records);

  // Year-end projection (Pro only)
  if (isPro) countryData = projectYearEnd(countryData);

  // ── Summary stats ──
  if (summaryEl) {
    const total = countryData.reduce((s, c) => s + c.days, 0);
    const atRisk = countryData.filter(c => c.status === 'danger' || c.status === 'exceeded').length;
    const countries = countryData.length;
    summaryEl.innerHTML = `
      <div class="ts-stat"><span class="ts-num">${countries}</span><span class="ts-label">Countries</span></div>
      <div class="ts-stat"><span class="ts-num">${total}</span><span class="ts-label">Total Days</span></div>
      <div class="ts-stat ${atRisk ? 'ts-alert' : ''}"><span class="ts-num">${atRisk}</span><span class="ts-label">At Risk</span></div>
    `;
  }

  // ── Country cards ──
  if (countryData.length === 0) {
    grid.innerHTML = `
      <div class="tracker-empty">
        <div style="font-size:3rem;margin-bottom:1rem;">🗺️</div>
        <h3>No trips logged yet</h3>
        <p class="text-dim">Add your first trip to start tracking residency thresholds.</p>
      </div>`;
    return;
  }

  grid.innerHTML = countryData.map(c => {
    const col = STATUS_COLORS[c.status];
    const flag = getFlagCode(c.country);
    const remaining = Math.max(0, c.threshold - c.days);
    const projectedHTML = isPro && c.projected != null
      ? `<div class="tc-projected" style="color:${c.projected >= c.threshold ? '#ef4444' : '#10b981'}">
           📈 Year-end projection: <strong>${c.projected} days</strong>
           ${c.projected >= c.threshold ? ' — <span style="color:#ef4444;">⚠ will trigger residency</span>' : ''}
         </div>`
      : '';

    // Alert badge (Pro only)
    let alertBadge = '';
    if (isPro) {
      if (c.status === 'exceeded') alertBadge = '<span class="tc-badge tc-badge-red">🚨 THRESHOLD EXCEEDED</span>';
      else if (c.status === 'danger') alertBadge = '<span class="tc-badge tc-badge-red">⚠️ CRITICAL — LEAVE SOON</span>';
      else if (c.status === 'warning') alertBadge = '<span class="tc-badge tc-badge-amber">⏳ APPROACHING LIMIT</span>';
    }

    return `
    <div class="tracker-card" style="border-color:${col.border};background:${col.bg};">
      <div class="tc-header">
        <div class="tc-country">
          <img src="https://flagcdn.com/w40/${flag}.png" alt="${c.country}" class="tc-flag" width="40" height="30">
          <div>
            <div class="tc-name">${c.country}${c.isCurrent ? ' <span class="tc-current">● NOW</span>' : ''}</div>
            <div class="tc-threshold-label">${c.threshold}-day threshold</div>
          </div>
        </div>
        <div class="tc-days-big">${c.days}<span class="tc-days-unit">days</span></div>
      </div>
      <div class="tc-bar-track">
        <div class="tc-bar-fill ${c.status === 'danger' || c.status === 'exceeded' ? 'tc-bar-pulse' : ''}"
             style="width:${c.pct}%;background:${col.bar};"></div>
        ${isPro ? `<div class="tc-bar-marker" style="left:${Math.round((150/c.threshold)*100)}%;" title="150-day warning line"></div>` : ''}
      </div>
      <div class="tc-footer">
        <span class="text-dim" style="font-size:0.8rem;">${c.pct}% of threshold</span>
        <span style="font-size:0.8rem;font-weight:600;color:${remaining <= THRESHOLD_DANGER ? '#ef4444' : remaining <= THRESHOLD_WARNING ? '#f59e0b' : 'var(--text-dim)'};">
          ${remaining > 0 ? remaining + ' days remaining' : 'Threshold reached'}
        </span>
      </div>
      ${alertBadge}
      ${projectedHTML}
    </div>`;
  }).join('');

  // ── Contextual Affiliate Upsell (appears when user has at-risk countries) ──
  const atRisk = countryData.filter(c => c.status === 'warning' || c.status === 'danger' || c.status === 'exceeded');
  if (atRisk.length > 0) {
    const upsellEl = document.getElementById('tracker-upsell');
    if (upsellEl) {
      upsellEl.style.display = 'block';
      const riskNames = atRisk.map(c => c.country).join(', ');
      upsellEl.querySelector('.upsell-context').textContent =
        `You're approaching tax residency in ${riskNames}. Plan your next move:`;
    }
  }

  // ── Pro upsell overlay for free users ──
  if (!isPro) {
    const proGate = document.getElementById('pro-gate-overlay');
    if (proGate) proGate.style.display = 'flex';
  }
}

// Export for dashboard.js
globalThis.NB_DaysTracker = { renderDaysTracker, computeCountryTotals };
