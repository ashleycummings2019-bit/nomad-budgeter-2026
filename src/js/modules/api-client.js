/**
 * api-client.js
 * Handles all network requests with timeout and caching.
 * API keys are now kept server-side — calls go through /api/ proxies.
 */

const CACHE_NAME = 'nb-api-cache-v1';
const TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const getCityData = async (city) => {
    const cacheKey = `nb_city_${city.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('📦 Using cached city data for:', city);
            return data;
        }
    }

    try {
        const response = await fetchWithTimeout(`/api/city-data?name=${encodeURIComponent(city)}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const cityData = data[0] || null;

        if (cityData) {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: cityData,
                timestamp: Date.now()
            }));
        }

        return cityData;
    } catch (e) {
        console.warn('City Data API unavailable, trying local fallback:', e.message);

        // Fallback 1: Check expired localStorage cache (stale data is better than no data)
        if (cached) {
            const { data } = JSON.parse(cached);
            console.log('📦 Using stale cached city data for:', city);
            return data;
        }

        // Fallback 2: Build a synthetic object from the page's own data if on a city page
        if (window.__NB_STATIC_CITY__ && window.__NB_STATIC_CITY__.name?.toLowerCase() === city.toLowerCase()) {
            console.log('📦 Using static page city data for:', city);
            return window.__NB_STATIC_CITY__;
        }

        // Fallback 3: Return a minimal synthetic object so the UI doesn't crash
        console.warn('No fallback data for:', city, '— using generic defaults');
        return {
            name: city,
            country: 'Unknown',
            population: 500000,
            is_capital: false
        };
    }
};

export const getExchangeRates = async () => {
    const cacheKey = 'nb_exchange_rates';
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('📦 Using cached exchange rates');
            return data;
        }
    }

    try {
        const response = await fetchWithTimeout('/api/exchange-rates');
        if (!response.ok) throw new Error('Failed to fetch rates');
        
        const data = await response.json();
        const rates = data.conversion_rates;

        localStorage.setItem(cacheKey, JSON.stringify({
            data: rates,
            timestamp: Date.now()
        }));

        return rates;
    } catch (e) {
        console.error('ExchangeRate API Error:', e);
        // Fallback to local rates.json if available
        try {
            const fallbackResponse = await fetch('/_data/rates.json');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                return fallbackData.conversion_rates || {};
            }
            throw new Error('Local fallback failed');
        } catch (f) {
            return { EUR: 0.92, GBP: 0.79, MXN: 17.0 }; // Extreme fallback
        }
    }
};
