/**
 * auth.js — Handles Clerk Authentication & UI State
 */

const CLERK_PUBLISHABLE_KEY = window.__NB_CONFIG__?.clerkPubKey;

async function initAuth() {
    if (!CLERK_PUBLISHABLE_KEY) {
        console.warn('Clerk Publishable Key missing');
        return;
    }

    try {
        await window.Clerk.load();

        const goProBtn = document.getElementById('header-go-pro');
        const userButtonDiv = document.createElement('div');
        userButtonDiv.id = 'clerk-user-button';
        
        if (window.Clerk.user) {
            console.log('User is logged in:', window.Clerk.user.primaryEmailAddress.emailAddress);
            
            // Transform "Go Pro" to "Dashboard"
            if (goProBtn) {
                goProBtn.innerText = 'Dashboard';
                goProBtn.href = '/dashboard/';
                goProBtn.classList.add('dashboard-active');
            }

            // Handle Pricing Page Buttons
            const handleSubscribe = async (plan) => {
                const billingToggle = document.getElementById('billing-toggle');
                const cycle = billingToggle && billingToggle.classList.contains('annual') ? 'annual' : 'monthly';
                
                // Track Checkout Intent
                if (window.gtag) {
                    window.gtag('event', 'begin_checkout', {
                        'plan': plan,
                        'cycle': cycle,
                        'value': plan === 'pro' ? (cycle === 'annual' ? 180 : 19) : (cycle === 'annual' ? 948 : 99),
                        'currency': 'USD'
                    });
                }

                try {
                    const response = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plan: plan,
                            cycle: cycle,
                            userId: window.Clerk.user.id,
                            email: window.Clerk.user.primaryEmailAddress.emailAddress
                        })
                    });
                    const data = await response.json();
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        console.error('Checkout failed:', data.error);
                        alert('Could not start checkout. Please try again.');
                    }
                } catch (err) {
                    console.error('Checkout error:', err);
                }
            };

            const proBtn = document.getElementById('btn-subscribe-pro');
            if (proBtn) {
                proBtn.addEventListener('click', () => handleSubscribe('pro'));
            }

            const upsellProBtn = document.getElementById('unlock-pro-btn');
            if (upsellProBtn) {
                upsellProBtn.addEventListener('click', () => handleSubscribe('pro'));
            }

            const bizBtn = document.getElementById('btn-subscribe-biz');
            if (bizBtn) {
                bizBtn.addEventListener('click', () => handleSubscribe('biz'));
            }

            // Mount user button
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(userButtonDiv);
                window.Clerk.mountUserButton(userButtonDiv);
            }
        } else {
            console.log('User is logged out');
            if (goProBtn) {
                goProBtn.href = '/pricing/'; // Point to pricing page
            }

            // Intercept pricing buttons for login
            const subscribeBtns = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
            subscribeBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', () => {
                        // Track Login Intent from Pricing or Home
                        if (window.gtag) {
                            window.gtag('event', 'pricing_cta_click', {
                                'plan_button': id,
                                'status': 'logged_out'
                            });
                        }
                        window.Clerk.openSignIn();
                    });
                }
            });
        }
    } catch (err) {
        console.error('Error initializing Clerk:', err);
    }
}

// Wait for Clerk to be available on window — with robust retry
function waitForClerk(maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
        if (window.Clerk) {
            initAuth();
            return;
        }
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(check, 200);
        } else {
            console.warn('Clerk did not load in time — attaching fallback handlers');
            // Fallback: wire unlock-pro-btn to redirect to pricing
            const fallbackBtn = document.getElementById('unlock-pro-btn');
            if (fallbackBtn && !fallbackBtn._hasHandler) {
                fallbackBtn.addEventListener('click', () => {
                    window.location.href = '/pricing/';
                });
                fallbackBtn._hasHandler = true;
            }
        }
    };
    check();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForClerk());
} else {
    waitForClerk();
}
