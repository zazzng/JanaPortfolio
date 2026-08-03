(function () {
  'use strict';

  /* ── Entry animations ── */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('revealed'), delay);
        observer.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
  );

  document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));

  /* ── Parallax (illustrations only) ── */
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length === 0) return;

  let ticking = false;

  function applyParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const dist = (rect.top + rect.height * 0.5) - vh * 0.5;
      const offset = Math.max(-30, Math.min(30, dist * -0.12));
      el.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

  applyParallax();
})();
