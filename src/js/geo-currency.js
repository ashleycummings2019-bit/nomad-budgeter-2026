/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   NOMAD BUDGETER — Geo Currency Switcher (v1.0)     ║
 * ║   Reads Edge Middleware cookies → converts prices    ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * This script reads the cookies set by middleware.js (nb_currency, nb_symbol)
 * and converts any USD-denominated prices on the page into the visitor's
 * local currency using the rates baked into rates.json by the Pulse script.
 *
 * Usage in templates:
 *   <span class="nb-price" data-usd="1250">$1,250</span>
 *
 * The script will convert $1,250 → £1,025 for a UK visitor automatically.
 * Add a currency toggle button with id="currency-toggle" to let users switch back.
 */

(function () {
  'use strict';

  // ─── Cookie Reader ───
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()};SameSite=Lax`;
  }

  // ─── State ───
  const detectedCurrency = getCookie('nb_currency') || 'USD';
  const detectedSymbol = getCookie('nb_symbol') || '$';
  const detectedCountry = getCookie('nb_country') || 'US';
  let activeCurrency = detectedCurrency;
  let activeSymbol = detectedSymbol;
  let rates = null;
  let isLocalMode = activeCurrency !== 'USD';

  // ─── Load Rates ───
  async function loadRates() {
    try {
      const res = await fetch('/api/rates.json');
      const data = await res.json();
      rates = data.rates;
    } catch (e) {
      console.warn('[GeoCurrency] Could not load rates, staying in USD.', e.message);
      rates = null;
      isLocalMode = false;
    }
  }

  // ─── Convert & Render ───
  function convertPrices() {
    const priceEls = document.querySelectorAll('.nb-price');
    if (!priceEls.length || !rates) return;

    const rate = rates[activeCurrency];
    if (!rate) return;

    // Add swap animation class
    priceEls.forEach(el => el.classList.add('swapping'));

    // Wait for fade-out then update text
    setTimeout(() => {
      priceEls.forEach(el => {
        const usd = parseFloat(el.dataset.usd);
        if (isNaN(usd)) return;

        if (isLocalMode && activeCurrency !== 'USD') {
          const converted = usd * rate;
          el.textContent = formatPrice(converted, activeCurrency, activeSymbol);
          el.setAttribute('title', `$${usd.toLocaleString('en-US')} USD`);
        } else {
          el.textContent = `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
          el.removeAttribute('title');
        }

        el.classList.remove('swapping');
      });

      // Show the "Converted to X" note if present
      const note = document.querySelector('.user-currency-note');
      const nameEl = document.querySelector('.user-currency-name');
      if (note && nameEl) {
        if (isLocalMode && activeCurrency !== 'USD') {
          nameEl.textContent = activeCurrency;
          note.style.display = 'inline';
        } else {
          note.style.display = 'none';
        }
      }
    }, 150);

    // Update any currency label badges
    const badges = document.querySelectorAll('.nb-currency-badge');
    badges.forEach(badge => {
      badge.textContent = isLocalMode ? activeCurrency : 'USD';
    });
  }

  function formatPrice(amount, currency, symbol) {
    // Large-value currencies: no decimals, group separators
    if (amount > 10000) {
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
    }
    if (amount > 100) {
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  }

  // ─── Toggle Button ───
  function initToggle() {
    const toggle = document.getElementById('currency-toggle');
    if (!toggle) return;

    // Show detected currency on the toggle
    updateToggleLabel(toggle);

    toggle.addEventListener('click', () => {
      isLocalMode = !isLocalMode;

      if (isLocalMode) {
        activeCurrency = detectedCurrency;
        activeSymbol = detectedSymbol;
      } else {
        activeCurrency = 'USD';
        activeSymbol = '$';
      }

      // Remember the user's preference — don't let middleware override it
      setCookie('nb_currency_manual', 'true', 30);

      updateToggleLabel(toggle);
      convertPrices();
    });
  }

  function updateToggleLabel(toggle) {
    if (detectedCurrency === 'USD') {
      toggle.style.display = 'none'; // No point toggling if they're already in USD
      return;
    }
    const flag = countryToFlag(detectedCountry);
    toggle.innerHTML = isLocalMode
      ? `${flag} ${activeCurrency} → <strong>Show USD</strong>`
      : `💵 USD → <strong>Show ${detectedCurrency}</strong>`;
    toggle.setAttribute('aria-label',
      isLocalMode ? 'Switch to USD prices' : `Switch to ${detectedCurrency} prices`);
  }

  // ─── Country code → Emoji Flag ───
  function countryToFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
  }

  // ─── Expose for other scripts ───
  window.__NB_GEO__ = {
    country: detectedCountry,
    currency: detectedCurrency,
    symbol: detectedSymbol,
    isLocal: () => isLocalMode,
    getRate: (c) => rates?.[c] || null,
    convert: (usd, toCurrency) => {
      const r = rates?.[toCurrency];
      return r ? usd * r : usd;
    },
    refresh: convertPrices,
  };

  // ─── Init ───
  async function init() {
    await loadRates();
    convertPrices();
    initToggle();

    // Log for debugging (remove in production if you want)
    if (detectedCurrency !== 'USD') {
      console.log(
        `[GeoCurrency] 🌍 Detected: ${detectedCountry} → showing prices in ${detectedCurrency} (${detectedSymbol})`
      );
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
