/**
 * affiliates.js
 * Logic for visa ROI and affiliate link mapping
 */

const VISA_AFFILIATES = {
    "Spain": "https://citizenremote.com/visas/spain-digital-nomad-visa/?ref=nomadbudgeter",
    "Portugal": "https://citizenremote.com/visas/portugal-d7-visa/?ref=nomadbudgeter",
    "UAE": "https://citizenremote.com/visas/dubai-remote-work-visa/?ref=nomadbudgeter",
    "Mexico": "https://citizenremote.com/visas/mexico-temporary-resident-visa/?ref=nomadbudgeter",
    "Italy": "https://citizenremote.com/visas/italy-digital-nomad-visa/?ref=nomadbudgeter",
    "Greece": "https://citizenremote.com/visas/greece-digital-nomad-visa/?ref=nomadbudgeter",
    "Croatia": "https://citizenremote.com/visas/croatia-digital-nomad-visa/?ref=nomadbudgeter",
    "Germany": "https://citizenremote.com/visas/germany-freelance-visa/?ref=nomadbudgeter"
};

const VISA_COSTS = {
    "Spain": 2500,
    "Portugal": 3000,
    "UAE": 1500,
    "Mexico": 1200,
    "Italy": 2800,
    "Greece": 2000,
    "Croatia": 1000,
    "Germany": 3500
};

export const getVisaInfo = (country) => {
    return {
        url: VISA_AFFILIATES[country] || "https://citizenremote.com/?ref=nomadbudgeter",
        cost: VISA_COSTS[country] || 2000
    };
};

export const calculateVisaROI = (taxSavings, setupCost) => {
    if (taxSavings <= 0) return null;
    const months = Math.ceil(setupCost / (taxSavings / 12));
    return months;
};
