document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 130; 
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const reportSections = document.querySelectorAll('.report-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            reportSections.forEach(s => {
                s.style.display = 'none';
                s.classList.remove('fade-in-up');
            });

            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.style.display = 'block';
                setTimeout(() => {
                    targetSection.classList.add('fade-in-up');
                }, 10);
            }
        });
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            menuToggle.classList.toggle('active');
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('open');
                menuToggle.classList.remove('active');
            });
        });
    }
});
