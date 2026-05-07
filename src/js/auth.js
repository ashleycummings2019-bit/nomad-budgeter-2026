/**
 * auth.js — Handles Clerk Authentication & UI State
 */

const CLERK_PUBLISHABLE_KEY = window.__NB_CONFIG__?.clerkPubKey;

async function initAuth() {
    console.log('[Auth] initAuth started');
    if (!CLERK_PUBLISHABLE_KEY) {
        console.warn('[Auth] Clerk Publishable Key missing in __NB_CONFIG__');
        return;
    }

    try {
        console.log('[Auth] Awaiting window.Clerk.load()');
        await window.Clerk.load();
        console.log('[Auth] window.Clerk.load() finished. User:', window.Clerk.user);

        const goProBtn = document.getElementById('header-go-pro');
        const userButtonDiv = document.createElement('div');
        userButtonDiv.id = 'clerk-user-button';
        
        if (window.Clerk.user) {
            console.log('[Auth] User is logged in:', window.Clerk.user.primaryEmailAddress.emailAddress);
            
            // Transform "Go Pro" to "Dashboard"
            if (goProBtn) {
                goProBtn.innerText = 'Dashboard';
                goProBtn.href = '/dashboard/';
                goProBtn.classList.add('dashboard-active');
            }

            // Handle Pricing Page Buttons
            const handleSubscribe = async (plan) => {
                console.log(`[Auth] handleSubscribe clicked for plan: ${plan}`);
                const billingToggle = document.getElementById('billing-toggle');
                const cycle = billingToggle && billingToggle.classList.contains('annual') ? 'annual' : 'monthly';
                console.log(`[Auth] Detected cycle: ${cycle}`);
                
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
                    console.log(`[Auth] Fetching /api/create-checkout for ${plan}`);
                    // Ensure the button shows loading state if possible
                    const btnId = plan === 'pro' ? 'btn-subscribe-pro' : 'btn-subscribe-biz';
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        const originalText = btn.innerText;
                        btn.innerText = 'Processing...';
                        btn.disabled = true;
                        
                        setTimeout(() => { // Revert back in case of error
                            if(btn) { btn.innerText = originalText; btn.disabled = false; }
                        }, 5000);
                    }

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
                    console.log('[Auth] /api/create-checkout response:', data);
                    
                    if (data.url) {
                        console.log('[Auth] Redirecting to Stripe checkout URL:', data.url);
                        window.location.href = data.url;
                    } else {
                        console.error('[Auth] Checkout failed without URL:', data.error);
                        alert('Could not start checkout. Please try again: ' + (data.error || 'Unknown error'));
                    }
                } catch (err) {
                    console.error('[Auth] Checkout network error:', err);
                    alert('Network error connecting to checkout provider. Please try again.');
                }
            };

            const proBtn = document.getElementById('btn-subscribe-pro');
            if (proBtn) {
                console.log('[Auth] Found btn-subscribe-pro, adding click listener (Logged In)');
                proBtn.addEventListener('click', () => handleSubscribe('pro'));
            } else {
                console.log('[Auth] btn-subscribe-pro NOT found on page');
            }

            const upsellProBtn = document.getElementById('unlock-pro-btn');
            if (upsellProBtn) {
                console.log('[Auth] Found unlock-pro-btn, adding click listener (Logged In)');
                upsellProBtn.addEventListener('click', () => handleSubscribe('pro'));
            }

            const bizBtn = document.getElementById('btn-subscribe-biz');
            if (bizBtn) {
                console.log('[Auth] Found btn-subscribe-biz, adding click listener (Logged In)');
                bizBtn.addEventListener('click', () => handleSubscribe('biz'));
            } else {
                console.log('[Auth] btn-subscribe-biz NOT found on page');
            }

            // Mount user button
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(userButtonDiv);
                window.Clerk.mountUserButton(userButtonDiv);
            }
        } else {
            console.log('[Auth] User is logged out');
            if (goProBtn) {
                goProBtn.href = '/pricing/'; // Point to pricing page
            }

            // Intercept pricing buttons for login
            const subscribeBtns = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
            subscribeBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    console.log(`[Auth] Found ${id}, adding click listener (Logged Out)`);
                    btn.addEventListener('click', () => {
                        console.log(`[Auth] Clicked ${id} while logged out. Opening SignIn modal.`);
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
        console.error('[Auth] Error initializing Clerk:', err);
    }
}

// Wait for Clerk to be available on window — with robust retry
function waitForClerk(maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
        if (window.Clerk) {
            console.log('[Auth] window.Clerk is present. Running initAuth.');
            initAuth();
            return;
        }
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(check, 200);
        } else {
            console.warn('[Auth] Clerk did not load in time — attaching fallback handlers to all pricing buttons');
            // Fallback: wire all pricing buttons to redirect to /pricing or refresh
            const subscribeBtns = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
            subscribeBtns.forEach(id => {
                const fallbackBtn = document.getElementById(id);
                if (fallbackBtn && !fallbackBtn._hasHandler) {
                    fallbackBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`[Auth] Fallback button click for ${id}. Redirecting to /pricing/`);
                        window.location.href = '/pricing/';
                    });
                    fallbackBtn._hasHandler = true;
                }
            });
        }
    };
    check();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForClerk());
} else {
    waitForClerk();
}
