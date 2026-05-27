module.exports = function() {
  const freshness = require('./freshness.json');
  return {
    ... {
    "name": "Nomad Budgeter",
    "url": "https://www.nomadbudgeter.com",
    "ga4": "G-CLF80Q4JZJ",
    "description": "Calculate your net income, taxes, and cost of living on global Digital Nomad Visas. Updated with 2026 tax brackets for 45+ countries.",
    "tagline": "Your 2026 Digital Nomad Financial Engine",
    "email": "hello@nomadbudgeter.com",
    "year": "2026",
    "dataLastVerified": "May 2026",
    "socialProof": "12,402 nomads",
    "apiKeys": {
        "clerkPubKey": "pk_live_Y2xlcmsubm9tYWRidWRnZXRlci5jb20k"
    },
    "affiliates": {
        "safetywing": {
            "name": "SafetyWing",
            "url": "https://safetywing.com/?referenceID=26514835&utm_source=nomadbudgeter&utm_medium=ambassador&utm_campaign=NB_2026_Insurance",
            "desc": "Global nomad health insurance meeting all 2026 visa requirements."
        },
        "wise": {
            "name": "Wise",
            "url": "https://wise.prf.hn/click/camref:1101l5JGeT",
            "desc": "Move money globally with the lowest 2026 exchange rate fees."
        },
        "nomadlist": {
            "name": "Nomad List",
            "url": "https://nomadlist.com?utm_source=nomadbudgeter&utm_medium=community&utm_campaign=NB_2026_Silo",
            "desc": "The #1 community for digital nomads."
        },
        "agoda": {
            "name": "Agoda Stays",
            "url": "https://www.agoda.com/?utm_source=nomadbudgeter&utm_medium=calculator&utm_campaign=NB_2026_Asia",
            "desc": "Best rates for monthly nomad rentals in Asia & beyond."
        },
        "blueground": {
            "name": "Blueground",
            "url": "https://www.theblueground.com/?utm_source=nomadbudgeter&utm_medium=toolkit&utm_campaign=All_2026_BuildMngrAuto",
            "desc": "Looking for a fully furnished apartment? Use promo code <span class='promo-code'>NOMADBUDGETER</span> to save <strong>5%</strong> on your stay.",
            "promoCode": "NOMADBUDGETER"
        },
        "interactiveBrokers": {
            "name": "Interactive Brokers",
            "url": "https://www.interactivebrokers.com/mkt/?src=nomadbudgeter&url=%2Fen%2Fhome.php",
            "desc": "The best brokerage for international expats and nomads."
        },
        "lexidy": {
            "name": "Lexidy Legal",
            "url": "https://lexidy.com/?utm_source=nomadbudgeter&utm_medium=affiliate&utm_campaign=NB_2026_Visa",
            "desc": "Verified legal experts for Spain, Portugal, and Greece digital nomad visas.",
            "countryUrls": {
                "portugal": "https://lexidy.com/portugal/?utm_source=nomadbudgeter&utm_medium=affiliate&utm_campaign=NB_2026_Visa",
                "spain": "https://lexidy.com/spain/?utm_source=nomadbudgeter&utm_medium=affiliate&utm_campaign=NB_2026_Visa",
                "greece": "https://lexidy.com/greece/?utm_source=nomadbudgeter&utm_medium=affiliate&utm_campaign=NB_2026_Visa"
            }
        },
        "saily": {
            "name": "Saily eSIM",
            "url": "https://saily.tp.st/XPRLV5qw",
            "desc": "Stay connected instantly with eSIM data roaming in 150+ countries. Set up in minutes before you land."
        },
        "ekta": {
            "name": "Ekta Insurance",
            "url": "https://ektatraveling.tp.st/OC777BtT",
            "desc": "Budget-friendly travel medical insurance starting at just $0.99/day, fully Schengen visa compliant."
        }
    },
    "stripe": {
        "pro": "https://buy.stripe.com/00wdR3aQeg521HXgzleAg0b",
        "biz": "https://buy.stripe.com/eVq28lbUi7ywfyN2IveAg0c"
    }
},
    dataLastVerified: freshness.displayDate || 'May 2026'
  };
};
