/**
 * ╔══════════════════════════════════════════════════╗
 * ║   NOMAD BUDGETER — Vercel Edge Middleware        ║
 * ║   Geo-detects user country → sets currency       ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Refactored for standard Web APIs (Eleventy compatible).
 * Uses Vercel Edge Runtime internal signaling to set cookies on static requests.
 */

// ─── Country → Currency Mapping ───
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

// ─── Currency Symbols ───
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
  matcher: ['/((?!api|favicon.ico|css|js|assets|images|robots.txt|sitemap).*)'],
};

export default function middleware(request) {
  const url = new URL(request.url);

  // 1. Dashboard Protection: Check for Clerk Session
  if (url.pathname.startsWith('/dashboard')) {
    // Vercel Edge Middleware request.cookies is a Map-like object
    const cookieHeader = request.headers.get('cookie') || '';
    const hasSession = cookieHeader.includes('__session=');
    
    if (!hasSession) {
      console.log('🔒 Unauthenticated access to dashboard, redirecting to pricing...');
      return Response.redirect(new URL('/pricing/', request.url));
    }
  }

  // We use the internal 'x-middleware-next' header to tell Vercel
  // to proceed to the origin (static file) while allowing us to set headers.
  const response = new Response(null, {
    headers: {
      'x-middleware-next': '1',
    },
  });

  // 1. Check for manual override from cookies
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes('nb_currency_manual=true')) {
    return response;
  }

  // 2. Geo-detection from Vercel's platform headers
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || '';
  
  // 3. Determine local currency
  const currency = COUNTRY_CURRENCY[country] || 'USD';
  const symbol = CURRENCY_SYMBOLS[currency] || '$';

  // 4. Set cookies (Path=/ is critical for global access)
  const cookieOptions = '; Path=/; Max-Age=86400; SameSite=Lax';

  response.headers.append('Set-Cookie', `nb_country=${country}${cookieOptions}`);
  response.headers.append('Set-Cookie', `nb_currency=${currency}${cookieOptions}`);
  response.headers.append('Set-Cookie', `nb_symbol=${encodeURIComponent(symbol)}${cookieOptions}`);
  
  if (city) {
    response.headers.append('Set-Cookie', `nb_city=${encodeURIComponent(city)}${cookieOptions}`);
  }

  return response;
}
