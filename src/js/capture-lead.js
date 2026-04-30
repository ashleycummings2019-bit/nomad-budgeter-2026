// capture-lead.js
document.addEventListener('DOMContentLoaded', () => {
    const sendGuideBtns = document.querySelectorAll('#send-guide-btn');
    
    sendGuideBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const container = e.target.closest('.lead-content, .expert-verdict-content, .lead-card');
            if (!container) return;
            
            const emailInput = container.querySelector('#lead-email');
            const successMsg = container.querySelector('#lead-success');
            const originalBtnText = btn.textContent;
            
            if (emailInput && emailInput.value && emailInput.value.includes('@')) {
                const email = emailInput.value;
                
                // Show loading state
                btn.disabled = true;
                btn.textContent = 'Sending...';
                
                try {
                    const response = await fetch('/api/capture-lead', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email,
                            source: window.location.pathname
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        // "Save for updates" functionality (Dynamic Monitoring)
                        const subscriberList = JSON.parse(localStorage.getItem('nomadSubscribers') || '[]');
                        if (!subscriberList.includes(email)) {
                            subscriberList.push(email);
                            localStorage.setItem('nomadSubscribers', JSON.stringify(subscriberList));
                        }

                        emailInput.value = '';
                        if (successMsg) {
                            successMsg.classList.remove('hidden');
                            successMsg.style.display = 'flex';
                            
                            setTimeout(() => {
                                successMsg.classList.add('hidden');
                                successMsg.style.display = '';
                            }, 8000);
                        }
                    } else {
                        console.error('Lead Capture Error:', result.error);
                        alert('Oops! ' + (result.error || 'Something went wrong. Please try again.'));
                    }
                } catch (err) {
                    console.error('Network Error:', err);
                    alert('Network error. Please check your connection.');
                } finally {
                    btn.disabled = false;
                    btn.textContent = originalBtnText;
                }
            } else {
                if (emailInput) {
                    emailInput.style.border = '2px solid #ef4444';
                    emailInput.focus();
                    setTimeout(() => {
                        emailInput.style.border = '';
                    }, 2000);
                }
            }
        });
    });
});
