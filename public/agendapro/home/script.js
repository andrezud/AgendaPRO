document.addEventListener('DOMContentLoaded', () => {
    // Reveal animation on scroll
    const reveal = () => {
        const entries = document.querySelectorAll('.reveal');
        const trigger = window.innerHeight - 150;
        entries.forEach(entry => {
            const entryTop = entry.getBoundingClientRect().top;
            if (entryTop < trigger) {
                entry.classList.add('reveal-visible');
            }
        });
    };

    // Initial state setup for reveal elements
    document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "all 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)";
    });

    // Reveal elements on load
    reveal();

    // Reveal elements on scroll
    window.addEventListener('scroll', reveal);

    // CSS injection for visible class
    const style = document.createElement('style');
    style.innerHTML = '.reveal-visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);

    console.log("%cANDROC Engineering: AgendaPro High-End UI", "color: #2563eb; font-weight: bold;");
});