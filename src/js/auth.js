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
        const signInLink = document.getElementById('header-signin-link');
        const userButtonDiv = document.getElementById('header-user-btn');
        
        if (window.Clerk.user) {
            console.log('[Auth] User is logged in:', window.Clerk.user.primaryEmailAddress.emailAddress);
            
            // Hide Sign In link
            if (signInLink) signInLink.style.display = 'none';
            
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
                
                // Track Checkout Intent
                if (window.gtag) {
                    window.gtag('event', 'begin_checkout', {
                        'plan': plan,
                        'cycle': cycle,
                        'value': plan === 'pro' ? (cycle === 'annual' ? 180 : 19) : (cycle === 'annual' ? 948 : 99),
                        'currency': 'USD'
                    });
                }

                // Ensure user is still signed in
                if (!window.Clerk?.user) {
                    console.warn('[Auth] User session not found. Prompting sign-in.');
                    window.Clerk?.openSignIn();
                    return;
                }

                const btnId = plan === 'pro' ? 'btn-subscribe-pro' : 'btn-subscribe-biz';
                const btn = document.getElementById(btnId);
                const originalText = btn ? btn.innerText : 'Unlock Features';

                try {
                    console.log(`[Auth] Requesting checkout: ${plan} (${cycle})`);
                    
                    if (btn) {
                        btn.innerText = 'Preparing Secure Checkout...';
                        btn.disabled = true;
                    }

                    const payload = {
                        plan: plan,
                        cycle: cycle,
                        userId: window.Clerk.user.id,
                        email: window.Clerk.user.primaryEmailAddress?.emailAddress
                    };

                    console.log('[Auth] Checkout Payload:', payload);

                    const response = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    const data = await response.json();
                    console.log('[Auth] Server Response:', data);
                    
                    if (!response.ok) {
                        throw new Error(data.error || `Server Error (${response.status})`);
                    }

                    if (data.url) {
                        console.log('[Auth] Redirecting to Stripe:', data.url);
                        window.location.href = data.url;
                    } else {
                        throw new Error('Server did not return a checkout URL.');
                    }
                } catch (err) {
                    console.error('[Auth] Checkout Error:', err);
                    alert(`Unable to start checkout: ${err.message}\n\nPlease refresh and try again or contact hello@nomadbudgeter.com if this persists.`);
                    if (btn) {
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                }
            };

            const proBtn = document.getElementById('btn-subscribe-pro');
            if (proBtn) {
                console.log('[Auth] Found btn-subscribe-pro, adding click listener (Logged In)');
                proBtn._authWired = true;
                proBtn.addEventListener('click', () => handleSubscribe('pro'));
            } else {
                console.log('[Auth] btn-subscribe-pro NOT found on page');
            }

            const upsellProBtn = document.getElementById('unlock-pro-btn');
            if (upsellProBtn) {
                console.log('[Auth] Found unlock-pro-btn, adding click listener (Logged In)');
                upsellProBtn._authWired = true;
                upsellProBtn.addEventListener('click', () => handleSubscribe('pro'));
            }

            const bizBtn = document.getElementById('btn-subscribe-biz');
            if (bizBtn) {
                console.log('[Auth] Found btn-subscribe-biz, adding click listener (Logged In)');
                bizBtn._authWired = true;
                bizBtn.addEventListener('click', () => handleSubscribe('biz'));
            } else {
                console.log('[Auth] btn-subscribe-biz NOT found on page');
            }

            // Mount user button
            if (userButtonDiv) {
                window.Clerk.mountUserButton(userButtonDiv);
            }
        } else {
            console.log('[Auth] User is logged out');
            
            // Show Sign In link and wire it
            if (signInLink) {
                signInLink.style.display = 'block';
                signInLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.Clerk.openSignIn();
                });
            }
            if (goProBtn) {
                goProBtn.href = '/pricing/'; // Point to pricing page
            }

            // Intercept pricing buttons for login
            const subscribeBtns = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
            subscribeBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    console.log(`[Auth] Found ${id}, adding click listener (Logged Out)`);
                    btn._authWired = true;
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

// Immediately wire fallback handlers so buttons always respond to clicks,
// even before Clerk has loaded. These are replaced once auth.js fully initialises.
function wirePreAuthFallbacks() {
    const btnIds = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
    btnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn && !btn._authWired) {
            btn.addEventListener('click', function preAuthHandler(e) {
                if (this._authWired) return; // Real handler will fire via auth.js
                e.stopImmediatePropagation();
                if (window.Clerk && !window.Clerk.user) {
                    window.Clerk.openSignIn();
                } else if (!window.Clerk) {
                    alert('Loading authentication... please try again in a moment.');
                }
            });
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        wirePreAuthFallbacks();
        waitForClerk();
    });
} else {
    wirePreAuthFallbacks();
    waitForClerk();
}
