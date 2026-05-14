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
  
  // Lifestyle state
  let lifestyleTier = localStorage.getItem('nb-lifestyle') || 'comfort';
  const lifestyleMultipliers = {
    budget: 0.72,
    comfort: 1.0,
    luxury: 1.95
  };

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
    if (!priceEls.length) return;

    const rate = rates ? (rates[activeCurrency] || 1) : 1;
    const lfm = lifestyleMultipliers[lifestyleTier] || 1.0;

    // Add swap animation class
    priceEls.forEach(el => el.classList.add('swapping'));

    // Wait for fade-out then update text
    setTimeout(() => {
      priceEls.forEach(el => {
        const usdBase = parseFloat(el.dataset.usd);
        if (isNaN(usdBase)) return;

        // Apply lifestyle multiplier first
        const adjustedUsd = usdBase * lfm;

        if (isLocalMode && activeCurrency !== 'USD' && rates) {
          const converted = adjustedUsd * rate;
          el.textContent = formatPrice(converted, activeCurrency, activeSymbol);
          el.setAttribute('title', `$${adjustedUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD (${lifestyleTier})`);
        } else {
          el.textContent = formatPrice(adjustedUsd, 'USD', '$');
          el.removeAttribute('title');
        }

        el.classList.remove('swapping');
      });

      // Update descriptors if they exist
      const descEl = document.getElementById('lifestyleDesc');
      if (descEl) {
        const descs = {
          budget: "Estimating for a lean, high-flex budget lifestyle.",
          comfort: "Estimating for a comfortable, standard nomad lifestyle.",
          luxury: "Estimating for a premium, high-end nomad lifestyle."
        };
        descEl.textContent = descs[lifestyleTier];
      }
    }, 150);
  }

  function formatPrice(amount, currency, symbol) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace(currency, '').trim(); 
  }

  // ─── Toggle Button (Currency) ───
  function initCurrencyToggle() {
    const toggle = document.getElementById('currency-toggle');
    if (!toggle) return;
    updateToggleLabel(toggle);
    toggle.addEventListener('click', () => {
      isLocalMode = !isLocalMode;
      activeCurrency = isLocalMode ? detectedCurrency : 'USD';
      activeSymbol = isLocalMode ? detectedSymbol : '$';
      setCookie('nb_currency_manual', 'true', 30);
      updateToggleLabel(toggle);
      convertPrices();
    });
  }

  // ─── Lifestyle Toggle ───
  function initLifestyleToggle() {
    const selector = document.getElementById('lifestyleSelector');
    if (!selector) return;
    
    const buttons = selector.querySelectorAll('.lifestyle-btn');
    
    // Set initial active state
    buttons.forEach(btn => {
      if (btn.dataset.tier === lifestyleTier) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        
        lifestyleTier = btn.dataset.tier;
        localStorage.setItem('nb-lifestyle', lifestyleTier);
        
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        convertPrices();
        document.dispatchEvent(new CustomEvent('nb-lifestyle-change', { detail: { tier: lifestyleTier } }));
      });
    });
  }

  function updateToggleLabel(toggle) {
    if (detectedCurrency === 'USD') {
      toggle.style.display = 'none';
      return;
    }
    const flag = countryToFlag(detectedCountry);
    toggle.innerHTML = isLocalMode
      ? `${flag} ${activeCurrency} → <strong>Show USD</strong>`
      : `💵 USD → <strong>Show ${detectedCurrency}</strong>`;
  }

  // ─── Country code → Emoji Flag ───
  function countryToFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
  }

  // ─── Expose for other scripts ───
  globalThis.__NB_GEO__ = {
    country: detectedCountry,
    currency: detectedCurrency,
    symbol: detectedSymbol,
    isLocal: () => isLocalMode,
    getTier: () => lifestyleTier,
    refresh: convertPrices,
  };

  // ─── Init ───
  async function init() {
    await loadRates();
    initCurrencyToggle();
    initLifestyleToggle();
    convertPrices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
