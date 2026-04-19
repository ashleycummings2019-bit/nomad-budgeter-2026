// ==========================================
// 1. CONFIGURATION & API KEYS
// ==========================================
const API_KEYS = {
    exchangeRate: '4fee8fc6019902b0118cd93b', 
    apiNinjas: 'w6V4eBiDD9LbVmMTaKevQ5BWZIH350AKg1AoGBYt' 
};

// Fallback rates if API fails
const fallbackRates = { "USD": 1, "EUR": 0.92, "AED": 3.67, "IDR": 15800 };

// ==========================================
// 2. FETCH REAL-TIME CURRENCY RATES
// ==========================================
let cachedRates = null;

async function fetchCurrencyRates() {
    // If we already have rates stored for this user session, don't waste API credits calling it again.
    if (cachedRates) return cachedRates;

    try {
        if(API_KEYS.exchangeRate === 'YOUR_EXCHANGERATE_API_KEY') {
            console.log("Using fallback currency rates (missing ExchangeRate API Key)");
            return fallbackRates;
        }

        const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEYS.exchangeRate}/latest/USD`);
        const data = await response.json();
        
        if (data.result === "success") {
            cachedRates = data.conversion_rates;
            console.log("Currency rates loaded successfully.");
            return cachedRates;
        }
    } catch (error) {
        console.error("Error fetching currency rates:", error);
    }
    return fallbackRates;
}

// ==========================================
// 3. FETCH CITY DATA & TAX INFO (API NINJAS)
// ==========================================
async function fetchCityData(city) {
    if(API_KEYS.apiNinjas === 'YOUR_API_NINJAS_KEY') {
        // Fallback to mock data for demo if key is not set
        const mocks = {
            "lisbon": { country: "PT", name: "Lisbon" },
            "dubai": { country: "AE", name: "Dubai" },
            "bali": { country: "ID", name: "Bali" }
        };
        return mocks[city.toLowerCase()] || { country: "US", name: city };
    }

    try {
        const response = await fetch(`https://api.api-ninjas.com/v1/city?name=${city}`, {
            headers: { 'X-Api-Key': API_KEYS.apiNinjas }
        });
        const data = await response.json();
        if (data && data.length > 0) return data[0]; // Returns city object with country code
    } catch (error) {
        console.error("Error fetching city data:", error);
    }
    return null;
}

async function fetchIncomeTax(income, countryCode) {
    if(API_KEYS.apiNinjas === 'YOUR_API_NINJAS_KEY') {
        // Fallback mock taxes if key is not set
        const mockTaxRates = { "PT": 0.20, "AE": 0.0, "ID": 0.0, "US": 0.25, "ES": 0.24 };
        const rate = mockTaxRates[countryCode] !== undefined ? mockTaxRates[countryCode] : 0.20;
        return { total_tax: income * rate };
    }

    try {
        const response = await fetch(`https://api.api-ninjas.com/v1/incometaxcalculator?income=${income}&country=${countryCode}`, {
            headers: { 'X-Api-Key': API_KEYS.apiNinjas }
        });
        const data = await response.json();
        return data; // Returns object with total_tax, tax_brackets, etc.
    } catch (error) {
        console.error("Error fetching tax data:", error);
    }
    return null;
}

// ==========================================
// 4. MAIN CALCULATOR LOGIC
// ==========================================
async function calculateNomadBudget() {
    const incomeInput = document.getElementById('income').value;
    const destinationInput = document.getElementById('destination').value;

    if (!incomeInput || incomeInput <= 0) {
        alert("Please enter a valid annual income.");
        return;
    }
    if (!destinationInput) {
        alert("Please enter a destination city.");
        return;
    }

    const grossUSD = parseFloat(incomeInput);

    // Show loading state (keeps user on page to view ads)
    document.getElementById('results').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('calculate-btn').disabled = true;

    try {
        // 1. Get Currency Rates
        const rates = await fetchCurrencyRates();

        // 2. Determine Country from City Name using API Ninjas
        const cityData = await fetchCityData(destinationInput);
        if (!cityData || !cityData.country) {
            throw new Error(`Could not find data for city: ${destinationInput}`);
        }
        const countryCode = cityData.country;

        // 3. Fetch Income Tax for Country using API Ninjas
        const taxData = await fetchIncomeTax(grossUSD, countryCode);
        const annualTaxUSD = taxData && taxData.total_tax !== undefined 
            ? parseFloat(taxData.total_tax) 
            : grossUSD * 0.20; // 20% fallback if undefined

        // Note: For a true global app, you'd also call a Cost of Living API here. 
        // We'll use a placeholder average for now (or a basic map)
        const mockMonthlyCol = { "PT": 1800, "AE": 3500, "ID": 1300, "ES": 2200 };
        const monthlyColUSD = mockMonthlyCol[countryCode] || 2000; 

        // Introduce deliberate 1.5s delay to maximize AdSense visibility
        setTimeout(() => {
            const netAnnualUSD = grossUSD - annualTaxUSD;
            const netMonthlyUSD = netAnnualUSD / 12;
            const leftoverUSD = netMonthlyUSD - monthlyColUSD;

            // 4. Local currency logic depending on countryCode
            const localCurrencyMap = { "PT": "EUR", "ES": "EUR", "AE": "AED", "ID": "IDR", "US": "USD" };
            const localCurrency = localCurrencyMap[countryCode] || "USD";
            const exchangeRate = (rates && rates[localCurrency]) ? rates[localCurrency] : 1;
            const leftoverLocal = leftoverUSD * exchangeRate;

            // 5. Formatters
            const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            const localFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: localCurrency, maximumFractionDigits: 0 });

            // 6. Inject into DOM
            document.getElementById('res-gross').innerText = usdFormatter.format(grossUSD);
            document.getElementById('res-tax').innerText = "-" + usdFormatter.format(annualTaxUSD);
            document.getElementById('res-net').innerText = usdFormatter.format(netAnnualUSD);
            document.getElementById('res-col').innerText = usdFormatter.format(monthlyColUSD) + " / mo";
            
            const leftoverEl = document.getElementById('res-leftover');
            leftoverEl.innerHTML = `${usdFormatter.format(leftoverUSD)} <br><span style="font-size:0.8rem; color:#64748b;">(${localFormatter.format(leftoverLocal)} in local currency)</span>`;

            // Color coding based on whether the nomad goes broke or saves money
            if (leftoverUSD < 0) {
                leftoverEl.style.color = "#ef4444"; // Red
            } else {
                leftoverEl.style.color = "#16a34a"; // Green
            }

            // Hide loading, show results
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('results').classList.remove('hidden');
            document.getElementById('calculate-btn').disabled = false;

        }, 1500); 

    } catch (error) {
        alert(error.message || "An error occurred.");
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('calculate-btn').disabled = false;
    }
}

// ==========================================
// 5. EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Pre-fetch currency rates silently in background when page loads
    fetchCurrencyRates();
    document.getElementById('calculate-btn').addEventListener('click', calculateNomadBudget);
});
