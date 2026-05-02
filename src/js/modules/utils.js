/**
 * utils.js
 * Common utility functions for Nomad Budgeter
 */

export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatPercent = (value) => {
    return (value * 100).toFixed(1) + '%';
};

export const getAuraColor = (score) => {
    if (score >= 90) return '#10b981'; // Emerald - Elite
    if (score >= 70) return '#8b5cf6'; // Violet - Great
    if (score >= 50) return '#3b82f6'; // Blue - Stable
    if (score >= 30) return '#f59e0b'; // Amber - Tight
    return '#ef4444'; // Red - Warning
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
