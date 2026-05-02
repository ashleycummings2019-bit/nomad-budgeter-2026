/**
 * ╔══════════════════════════════════════════════════╗
 * ║   NOMAD BUDGETER — Vercel Edge Middleware        ║
 * ║   Geo-detects user country → sets currency       ║
 * ╚══════════════════════════════════════════════════╝
 *
 * How it works:
 * 1. Vercel injects `request.geo.country` on every request (Pro tier).
 * 2. We map that ISO country code to a currency code (GBP, EUR, THB, etc.).
 * 3. We set a `nb_currency` cookie so the client-side JS can read it
 *    and display prices in the visitor's local currency.
 * 4. We also set `nb_country` for any geo-specific logic (visa pages, etc.).
 *
 * The cookie approach (vs. rewriting HTML) keeps our static 11ty pages
 * fully cacheable on the CDN — no per-user HTML generation required.
 */

import { NextResponse } from 'next/server';

// ─── Country → Currency Mapping ───
// Covers the top 50+ nomad-relevant countries.
// Falls back to USD for unknown regions.
const COUNTRY_CURRENCY = {
  // Europe
  GB: 'GBP', IE: 'GBP',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', PT: 'EUR', IT: 'EUR', NL: 'EUR',
  AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR', HR: 'EUR', EE: 'EUR',
  LT: 'EUR', LV: 'EUR', SK: 'EUR', SI: 'EUR', MT: 'EUR', CY: 'EUR',
  LU: 'EUR', MC: 'EUR',
  CH: 'CHF', LI: 'CHF',
  SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  TR: 'TRY', AM: 'AMD', GE: 'GEL', AL: 'ALL', RS: 'RSD',

  // Asia-Pacific
  TH: 'THB', VN: 'VND', ID: 'IDR', MY: 'MYR', PH: 'PHP',
  SG: 'SGD', JP: 'JPY', KR: 'KRW', TW: 'TWD', HK: 'HKD',
  IN: 'INR', LK: 'LKR', NP: 'NPR',
  AU: 'AUD', NZ: 'NZD',

  // Americas
  CA: 'CAD', MX: 'MXN', BR: 'BRL', CO: 'COP', AR: 'ARS',
  CL: 'CLP', PE: 'PEN', UY: 'UYU', CR: 'CRC', PA: 'PAB', GT: 'GTQ',

  // Middle East & Africa
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD',
  IL: 'ILS', JO: 'JOD', EG: 'EGP',
  ZA: 'ZAR', KE: 'KES', NG: 'NGN', GH: 'GHS', MA: 'MAD',
};

// ─── Currency Symbols (for client-side display) ───
const CURRENCY_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr',
  PLN: 'zł', CZK: 'Kč', HUF: 'Ft', TRY: '₺',
  THB: '฿', VND: '₫', IDR: 'Rp', MYR: 'RM', PHP: '₱',
  SGD: 'S$', JPY: '¥', KRW: '₩', TWD: 'NT$', HKD: 'HK$',
  INR: '₹', AUD: 'A$', NZD: 'NZ$',
  CAD: 'C$', MXN: 'MX$', BRL: 'R$', COP: 'COL$', ARS: 'AR$',
  CLP: 'CLP$', PEN: 'S/', UYU: '$U', CRC: '₡', PAB: 'B/.',
  AED: 'د.إ', SAR: '﷼', QAR: 'QR', KWD: 'KD', BHD: 'BD',
  ILS: '₪', JOD: 'JD', EGP: 'E£',
  ZAR: 'R', KES: 'KSh', NGN: '₦', GHS: 'GH₵', MAD: 'MAD',
  AMD: '֏', GEL: '₾', ALL: 'L', RSD: 'дин.', GTQ: 'Q',
};

export const config = {
  // Run on all page routes, skip static assets & API calls
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|css|js|assets|robots.txt|sitemap).*)'],
};

export default function middleware(request) {
  const response = NextResponse.next();

  // ── Don't overwrite if user has manually chosen a currency ──
  const manualOverride = request.cookies.get('nb_currency_manual');
  if (manualOverride?.value === 'true') {
    return response;
  }

  // ── Geo-detection (Vercel Pro injects this automatically) ──
  const country = request.geo?.country || 'US';
  const city = request.geo?.city || '';
  const currency = COUNTRY_CURRENCY[country] || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  // ── Set cookies (accessible by client-side JS) ──
  // Max-age: 24 hours — re-detected on next visit
  const cookieOptions = {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
  };

  response.cookies.set('nb_country', country, cookieOptions);
  response.cookies.set('nb_currency', currency, cookieOptions);
  response.cookies.set('nb_symbol', symbol, cookieOptions);
  if (city) {
    response.cookies.set('nb_city', city, cookieOptions);
  }

  return response;
}
