// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add scroll effect to navbar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(0, 0, 0, 0.6)';
    } else {
        navbar.style.background = 'rgba(0, 0, 0, 0.3)';
    }
});

// Add loading animation
document.addEventListener('DOMContentLoaded', function() {
    const heroContent = document.querySelector('.hero-content');
    const phoneMockup = document.querySelector('.phone-mockup');

if (phoneMockup) {
    phoneMockup.style.opacity = '0';
    phoneMockup.style.transform = 'translateY(30px)';
}

    
    // Animate elements on load
    setTimeout(() => {
        if (!heroContent) return;
        heroContent.style.transition = 'all 0.8s ease';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
    
        setTimeout(() => {
            if (phoneMockup) {
                phoneMockup.style.transition = 'all 0.8s ease';
                phoneMockup.style.opacity = '1';
                phoneMockup.style.transform = 'translateY(0)';
            }
        }, 200);
    }, 100);
    
});

// Add hover effects to download buttons
document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px) scale(1.02)';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Click tracking for download buttons
document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        if (this.classList.contains('google-play')) {
            console.log('Google Play Store clicked');
            window.open('https://play.google.com/store/apps/details?id=com.app.sidegigs', '_blank');
        } else if (this.classList.contains('app-store')) {
            console.log('App Store clicked');
            window.open('https://apps.apple.com/in/app/sidegigs/id6767884076', '_blank');
        }
    });
});