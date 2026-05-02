/**
 * aura-ticker.js
 * 
 * Simulates real-time financial market movements for the premium ticker.
 * Updates crypto, forex, and commodity prices with subtle volatility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const tickerItems = document.querySelectorAll('.ticker-item');
    if (!tickerItems.length) return;

    const markets = [
        { name: 'BTC/USD', price: 94231.50, volatility: 0.0005 },
        { name: 'ETH/USD', price: 3142.80, volatility: 0.0008 },
        { name: 'EUR/USD', price: 1.1702, volatility: 0.0001 },
        { name: 'GBP/USD', price: 1.3508, volatility: 0.0001 },
        { name: 'JPY/USD', price: 156.56, volatility: 0.0002 },
        { name: 'GOLD/USD', price: 2450.10, volatility: 0.0003 },
        { name: 'BRENT', price: 82.45, volatility: 0.0004 },
        { name: 'SPX', price: 5420.12, volatility: 0.0002 }
    ];

    // Initialize display
    const updateDisplay = () => {
        tickerItems.forEach((item, index) => {
            const market = markets[index];
            if (!market) return;

            // Random movement
            const movement = (Math.random() - 0.5) * 2 * market.volatility;
            const prevPrice = market.price;
            market.price *= (1 + movement);

            const span = item.querySelector('span');
            if (span) {
                const formattedPrice = market.name.includes('BTC') || market.name.includes('ETH') || market.name.includes('GOLD') 
                    ? `$${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : market.price.toFixed(4);
                
                span.textContent = formattedPrice;

                // Color coding based on movement
                if (market.price > prevPrice) {
                    item.classList.remove('negative');
                    item.classList.add('positive');
                } else {
                    item.classList.remove('positive');
                    item.classList.add('negative');
                }
            }
        });
    };

    // Update every 3 seconds for that "active" feel
    setInterval(updateDisplay, 3000);
    updateDisplay(); // Initial call
});
