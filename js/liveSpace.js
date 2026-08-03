/* liveSpace.js — scroll entry animations */

(function () {
  'use strict';

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
    .querySelectorAll('[data-animate], [data-animate="fade-only"]')
    .forEach((el) => observer.observe(el));
})();
