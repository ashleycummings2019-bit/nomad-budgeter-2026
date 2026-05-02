/**
 * ui-engine.js
 * Handles DOM updates, animations, and interactive charts
 */

import { formatCurrency, getAuraColor } from './utils.js';

export const animateScore = (target) => {
    const scoreEl = document.getElementById('aura-value');
    const ring = document.getElementById('aura-ring');
    if (!scoreEl || !ring) return;

    let current = 0;
    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (outQuart)
        const ease = 1 - Math.pow(1 - progress, 4);
        current = Math.floor(ease * target);
        
        scoreEl.textContent = current;
        const targetColor = getAuraColor(current);
        ring.style.background = `conic-gradient(${targetColor} ${current}%, transparent 0%)`;
        ring.style.boxShadow = `0 0 30px ${targetColor}33`;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
};

export const updateMetricBars = (data) => {
    const colBar = document.getElementById('col-health-bar');
    const savingsBar = document.getElementById('savings-health-bar');
    
    if (colBar) {
        const colPercent = Math.min((data.colIndex / 150) * 100, 100);
        colBar.style.width = `${colPercent}%`;
        colBar.style.backgroundColor = colPercent > 80 ? '#ef4444' : (colPercent > 50 ? '#f59e0b' : '#10b981');
    }
    
    if (savingsBar) {
        const savingsRatio = Math.min((data.monthlySavings / (data.monthlyNet || 1)) * 100, 100);
        savingsBar.style.width = `${savingsRatio}%`;
        savingsBar.style.backgroundColor = savingsRatio > 30 ? '#10b981' : (savingsRatio > 15 ? '#f59e0b' : '#ef4444');
    }
};

export const updateIncomeSimulator = (grossIncome, taxRate) => {
    const sliderVal = document.getElementById('slider-income-val');
    const takehomeBar = document.getElementById('chart-takehome-bar');
    const taxBar = document.getElementById('chart-tax-bar');
    const takehomeVal = document.getElementById('chart-takehome-val');
    const taxVal = document.getElementById('chart-tax-val');

    if (!sliderVal) return;

    const taxAmount = grossIncome * taxRate;
    const netIncome = grossIncome - taxAmount;

    sliderVal.textContent = formatCurrency(grossIncome);
    takehomeVal.textContent = formatCurrency(netIncome / 12);
    taxVal.textContent = formatCurrency(taxAmount / 12);

    // Update bars height
    const maxVal = grossIncome;
    const takehomePercent = (netIncome / maxVal) * 100;
    const taxPercent = (taxAmount / maxVal) * 100;

    if (takehomeBar) takehomeBar.style.height = `${takehomePercent}%`;
    if (taxBar) taxBar.style.height = `${taxPercent}%`;
};

/**
 * showToast
 * Premium toast notification system
 */
export const showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        error: '#ef4444',
        success: '#10b981',
        info: '#3b82f6',
        warning: '#f59e0b'
    };

    toast.className = 'aura-toast reveal';
    toast.style.cssText = `
        background: rgba(24, 24, 27, 0.9);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 4px solid ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-weight: 600;
        font-size: 0.9rem;
        min-width: 300px;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    `;

    toast.innerHTML = `
        <span>${message}</span>
        <button style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 1.2rem;">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    };

    closeBtn.onclick = removeToast;
    container.appendChild(toast);

    setTimeout(removeToast, 5000);
};

