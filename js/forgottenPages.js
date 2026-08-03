/* forgottenPages.js — scroll entry animations + illustration parallax */

(function () {
  'use strict';

  /* ── Entry animations via IntersectionObserver ── */

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const delay = parseInt(el.dataset.delay, 10) || 0;

        el.style.transitionDelay = delay + 'ms';
        el.classList.add('revealed');

        observer.unobserve(el);
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll('[data-animate], [data-animate="fade-only"], [data-animate="illustration"]')
    .forEach((el) => observer.observe(el));

  /* ── Parallax on .fp-parallax elements (illustrations only) ── */

  const parallaxEls = Array.from(document.querySelectorAll('.fp-parallax'));

  if (parallaxEls.length === 0) return;

  let rafPending = false;

  function applyParallax() {
    rafPending = false;

    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Center of element relative to viewport center
      const center = (rect.top + rect.height / 2 - viewH / 2) / viewH;

      // 85% scroll speed → 15% offset, clamped to ±30px
      const offset = Math.max(-30, Math.min(30, center * viewH * 0.15));

      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
  }

  window.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(applyParallax);
    }
  }, { passive: true });

  // Set initial positions on load
  applyParallax();
})();
