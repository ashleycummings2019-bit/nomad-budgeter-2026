/**
 * auth.js — Handles Clerk Authentication & UI State
 */

const CLERK_PUBLISHABLE_KEY = globalThis.__NB_CONFIG__?.clerkPubKey;

function trackCheckoutIntent(plan, cycle) {
    if (!globalThis.gtag) return;
    
    let value = 0;
    if (plan === 'pro') {
        value = (cycle === 'annual') ? 180 : 19;
    } else {
        value = (cycle === 'annual') ? 948 : 99;
    }
        
    globalThis.gtag('event', 'begin_checkout', {
        'plan': plan,
        'cycle': cycle,
        'value': value,
        'currency': 'USD'
    });
}

async function createCheckoutSession(plan, cycle, user) {
    const payload = {
        plan: plan,
        cycle: cycle,
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress
    };

    console.log('[Auth] Checkout Payload:', payload);

    const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `Server Error (${response.status})`);
    }
    return data;
}

async function handleSubscribe(plan) {
    console.log(`[Auth] handleSubscribe clicked for plan: ${plan}`);
    const billingToggle = document.getElementById('billing-toggle');
    const cycle = billingToggle?.classList.contains('annual') ? 'annual' : 'monthly';
    
    trackCheckoutIntent(plan, cycle);

    if (!globalThis.Clerk?.user) {
        console.warn('[Auth] User session not found. Prompting sign-in.');
        globalThis.Clerk?.openSignIn();
        return;
    }

    const btnId = plan === 'pro' ? 'btn-subscribe-pro' : 'btn-subscribe-biz';
    const btn = document.getElementById(btnId);
    const originalText = btn?.innerText || 'Unlock Features';

    try {
        if (btn) {
            btn.innerText = 'Preparing Secure Checkout...';
            btn.disabled = true;
        }

        const config = globalThis.__NB_CONFIG__;
        const stripeUrl = plan === 'pro' ? config?.stripeProUrl : config?.stripeBizUrl;

        if (stripeUrl) {
            console.log(`[Auth] Using Payment Link for ${plan}`);
            const url = new URL(stripeUrl);
            if (globalThis.Clerk?.user) {
                url.searchParams.set('client_reference_id', globalThis.Clerk.user.id);
                if (globalThis.Clerk.user.primaryEmailAddress?.emailAddress) {
                    url.searchParams.set('prefilled_email', globalThis.Clerk.user.primaryEmailAddress.emailAddress);
                }
            }
            globalThis.location.href = url.toString();
            return;
        }

        // Fallback to dynamic session if links are missing
        const data = await createCheckoutSession(plan, cycle, globalThis.Clerk.user);
        
        if (data.url) {
            globalThis.location.href = data.url;
        } else {
            throw new Error('Server did not return a checkout URL.');
        }
    } catch (err) {
        console.error('[Auth] Checkout Error:', err);
        alert(`Unable to start checkout: ${err.message}\n\nPlease refresh and try again.`);
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

function updateUIForLoggedInUser() {
    const goProBtn = document.getElementById('header-go-pro');
    const signInLink = document.getElementById('header-signin-link');
    const userButtonDiv = document.getElementById('header-user-btn');

    console.log('[Auth] User is logged in:', globalThis.Clerk.user.primaryEmailAddress.emailAddress);
    
    // Hide Sign In link
    if (signInLink) signInLink.style.display = 'none';
    
    // Transform "Go Pro" to "Dashboard"
    if (goProBtn) {
        goProBtn.innerText = 'Dashboard';
        goProBtn.href = '/dashboard/';
        goProBtn.classList.add('dashboard-active');
    }

    // Wire Pricing Buttons
    const buttons = [
        { id: 'btn-subscribe-pro', plan: 'pro' },
        { id: 'unlock-pro-btn', plan: 'pro' },
        { id: 'btn-subscribe-biz', plan: 'biz' }
    ];

    buttons.forEach(({ id, plan }) => {
        const btn = document.getElementById(id);
        if (btn) {
            console.log(`[Auth] Wiring ${id} (Logged In)`);
            btn._authWired = true;
            btn.addEventListener('click', () => handleSubscribe(plan));
        }
    });

    // Mount user button
    if (userButtonDiv) {
        globalThis.Clerk.mountUserButton(userButtonDiv);
    }
}

function updateUIForLoggedOutUser() {
    const goProBtn = document.getElementById('header-go-pro');
    const signInLink = document.getElementById('header-signin-link');

    console.log('[Auth] User is logged out');
    
    if (signInLink) {
        signInLink.style.display = 'block';
        signInLink.addEventListener('click', (e) => {
            e.preventDefault();
            globalThis.Clerk.openSignIn();
        });
    }
    if (goProBtn) {
        goProBtn.href = '/pricing/';
    }

    // Intercept pricing buttons for login
    const subscribeBtns = ['btn-subscribe-pro', 'btn-subscribe-biz', 'unlock-pro-btn'];
    subscribeBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            console.log(`[Auth] Wiring ${id} (Logged Out)`);
            btn._authWired = true;
            btn.addEventListener('click', () => {
                if (globalThis.gtag) {
                    globalThis.gtag('event', 'pricing_cta_click', {
                        'plan_button': id,
                        'status': 'logged_out'
                    });
                }
                globalThis.Clerk.openSignIn();
            });
        }
    });
}

async function initAuth() {
    console.log('[Auth] initAuth started');
    if (!CLERK_PUBLISHABLE_KEY) {
        console.warn('[Auth] Clerk Publishable Key missing in __NB_CONFIG__');
        return;
    }

    try {
        console.log('[Auth] Awaiting globalThis.Clerk.load()');
        await globalThis.Clerk.load();
        
        if (globalThis.Clerk.user) {
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (err) {
        console.error('[Auth] Error initializing Clerk:', err);
    }
}

// Wait for Clerk to be available on globalThis — with robust retry
function waitForClerk(maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
        if (globalThis.Clerk) {
            console.log('[Auth] globalThis.Clerk is present. Running initAuth.');
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
                        globalThis.location.href = '/pricing/';
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
                if (globalThis.Clerk && !globalThis.Clerk.user) {
                    globalThis.Clerk.openSignIn();
                } else if (!globalThis.Clerk) {
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
