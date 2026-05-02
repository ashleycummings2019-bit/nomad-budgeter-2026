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
    
    // ─── Automated Premium Modal Logic ───
    const modal = document.getElementById('aura-modal');
    const modalClose = document.getElementById('modal-close-btn');
    const modalSubmit = document.getElementById('modal-submit-btn');
    const modalEmail = document.getElementById('modal-email');
    const modalSuccess = document.getElementById('modal-success');
    const modalForm = document.getElementById('modal-lead-form');

    const showModal = () => {
        if (!sessionStorage.getItem('auraModalShown')) {
            modal.classList.add('active');
            sessionStorage.setItem('auraModalShown', 'true');
        }
    };

    // Trigger after 30 seconds
    setTimeout(showModal, 30000);

    // Trigger after 50% scroll
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > 50) {
            showModal();
        }
    }, { passive: true });

    // Close modal
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Handle modal submission
    if (modalSubmit) {
        modalSubmit.addEventListener('click', async () => {
            const email = modalEmail.value;
            if (email && email.includes('@')) {
                modalSubmit.disabled = true;
                const originalText = modalSubmit.innerHTML;
                modalSubmit.innerHTML = 'Sending...';

                try {
                    const response = await fetch('/api/capture-lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            source: 'automated-modal-' + window.location.pathname
                        })
                    });

                    if (response.ok) {
                        modalForm.style.display = 'none';
                        modalSuccess.style.display = 'flex';
                        modalSuccess.classList.remove('hidden');
                        
                        setTimeout(() => {
                            modal.classList.remove('active');
                        }, 3000);
                    }
                } catch (err) {
                    console.error('Modal Lead Error:', err);
                } finally {
                    modalSubmit.disabled = false;
                    modalSubmit.innerHTML = originalText;
                }
            } else {
                modalEmail.style.border = '2px solid #ef4444';
                modalEmail.focus();
                setTimeout(() => modalEmail.style.border = '', 2000);
            }
        });
    }
});
