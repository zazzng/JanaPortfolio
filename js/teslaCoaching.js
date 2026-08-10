/* ── Scroll entry animations ── */
(function () {
  'use strict';

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
})();
