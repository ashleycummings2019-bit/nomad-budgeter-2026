// capture-lead.js
document.addEventListener('DOMContentLoaded', () => {
    const sendGuideBtns = document.querySelectorAll('#send-guide-btn');
    
    const handleLeadCapture = async (btn, e) => {
        const container = e.target.closest('.lead-content, .expert-verdict-content, .lead-card, .hero-actions');
        if (!container) return;
        
        const emailInput = container.querySelector('#lead-email');
        const successMsg = container.querySelector('#lead-success');
        const originalBtnText = btn.textContent;
        
        if (!emailInput?.value?.includes('@')) {
            if (emailInput) {
                emailInput.style.border = '2px solid #ef4444';
                emailInput.focus();
                setTimeout(() => { emailInput.style.border = ''; }, 2000);
            }
            return;
        }

        const email = emailInput.value;
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            const response = await fetch(['/api', 'capture-lead'].join('/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    source: globalThis.location.pathname
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
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
    };

    sendGuideBtns.forEach(btn => {
        btn.addEventListener('click', (e) => handleLeadCapture(btn, e));
    });
    
    // ─── Automated Premium Modal Logic ───
    const modal = document.getElementById('aura-modal');
    const modalClose = document.getElementById('modal-close-btn');
    const modalSubmit = document.getElementById('modal-submit-btn');
    const modalEmail = document.getElementById('modal-email');
    const modalSuccess = document.getElementById('modal-success');
    const modalForm = document.getElementById('modal-lead-form');

    const showModal = () => {
        if (modal && !sessionStorage.getItem('auraModalShown')) {
            modal.classList.add('active');
            sessionStorage.setItem('auraModalShown', 'true');
        }
    };

    setTimeout(showModal, 45000);

    globalThis.addEventListener('scroll', () => {
        const scrollPercent = (globalThis.scrollY / (document.documentElement.scrollHeight - globalThis.innerHeight)) * 100;
        if (scrollPercent > 70) {
            showModal();
        }
    }, { passive: true });

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    if (modalSubmit) {
        modalSubmit.addEventListener('click', async () => {
            const email = modalEmail?.value;
            if (email?.includes('@')) {
                modalSubmit.disabled = true;
                const originalText = modalSubmit.innerHTML;
                modalSubmit.innerHTML = 'Sending...';

                try {
                    const response = await fetch(['/api', 'capture-lead'].join('/'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            source: 'automated-modal-' + globalThis.location.pathname
                        })
                    });

                    if (response.ok) {
                        if (modalForm) modalForm.style.display = 'none';
                        if (modalSuccess) {
                            modalSuccess.style.display = 'flex';
                            modalSuccess.classList.remove('hidden');
                        }
                        
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
            } else if (modalEmail) {
                modalEmail.style.border = '2px solid #ef4444';
                modalEmail.focus();
                setTimeout(() => { modalEmail.style.border = ''; }, 2000);
            }
        });
    }
});
