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
                try {
                    const response = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plan: plan,
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

            const bizBtn = document.getElementById('btn-subscribe-biz');
            if (bizBtn) {
                bizBtn.innerText = 'Go Business'; // Update from "Contact Sales"
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
            const proBtn = document.getElementById('btn-subscribe-pro');
            if (proBtn) {
                proBtn.addEventListener('click', () => window.Clerk.openSignIn());
            }
        }
    } catch (err) {
        console.error('Error initializing Clerk:', err);
    }
}

// Wait for Clerk to be available on window
if (window.Clerk) {
    initAuth();
} else {
    window.addEventListener('load', () => {
        if (window.Clerk) initAuth();
    });
}
