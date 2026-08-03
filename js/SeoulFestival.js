/* ── Scroll entry animations ── */
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
    .querySelectorAll('[data-animate], [data-animate="fade-only"], [data-animate="illustration"]')
    .forEach((el) => observer.observe(el));
})();

/* ============================================================
   SEOUL FESTIVAL — Hero carousel
   Auto-advances · click to select · wheel / touch navigation
   ============================================================ */

(function () {
  'use strict';

  const track = document.querySelector('.hero-carousel__track');
  const dotsContainer = document.querySelector('.hero-carousel__dots');
  if (!track || !dotsContainer) return;

  const cards = Array.from(track.querySelectorAll('img'));
  if (cards.length <= 1) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const AUTO_MS          = 1400;
  const RESUME_CLICK_MS  = 2000;
  const RESUME_TOUCH_MS  = 1200;
  const RESUME_WHEEL_MS  = 1000;

  let activeIndex = 0;
  let timerId     = null;
  let resumeId    = null;
  let dots        = [];

  /* ── Build dot indicators ──────────────────────────────── */
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-carousel__dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => {
      stopAuto();
      activeIndex = i;
      scrollToCard(activeIndex);
      pauseThenResume(RESUME_CLICK_MS);
    });
    dotsContainer.appendChild(dot);
    dots.push(dot);
  });

  /* ── Scroll a card into the centre of the track ────────── */
  function scrollToCard(index, behavior = 'smooth') {
    const card = cards[index];
    if (!card) return;

    const trackRect = track.getBoundingClientRect();
    const cardRect  = card.getBoundingClientRect();

    const targetLeft =
      track.scrollLeft +
      (cardRect.left - trackRect.left) -
      (track.clientWidth - cardRect.width) / 2;

    track.scrollTo({ left: Math.max(0, targetLeft), behavior });
    updateUI();
  }

  /* ── Scale + dim cards, sync dots ─────────────────────── */
  function updateUI() {
    cards.forEach((card, i) => {
      const active = i === activeIndex;
      card.style.opacity   = active ? '1'           : '0.45';
      card.style.transform = active ? 'scale(1.05)' : 'scale(0.92)';
      card.style.zIndex    = active ? '2'            : '1';
      card.style.boxShadow = active
        ? '0 12px 40px rgba(0,0,0,0.18)'
        : 'none';
    });

    dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
  }

  /* ── Auto-advance ──────────────────────────────────────── */
  function startAuto() {
    if (reducedMotion || timerId !== null) return;
    timerId = setInterval(() => {
      activeIndex = (activeIndex + 1) % cards.length;
      scrollToCard(activeIndex);
    }, AUTO_MS);
  }

  function stopAuto() {
    if (timerId !== null) { clearInterval(timerId); timerId = null; }
  }

  function pauseThenResume(delay) {
    stopAuto();
    if (reducedMotion) return;
    if (resumeId !== null) clearTimeout(resumeId);
    resumeId = setTimeout(startAuto, delay);
  }

  /* ── Click a card to select it ────────────────────────── */
  track.addEventListener('click', (e) => {
    const clicked = e.target.closest('img');
    if (!clicked) return;
    const idx = cards.indexOf(clicked);
    if (idx === -1 || idx === activeIndex) return;
    stopAuto();
    activeIndex = idx;
    scrollToCard(activeIndex);
    pauseThenResume(RESUME_CLICK_MS);
  });

  /* ── Mouse wheel navigation ────────────────────────────── */
  let wheelAcc = 0;
  track.addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelAcc += e.deltaX || e.deltaY;
    if (Math.abs(wheelAcc) > 60) {
      const dir   = wheelAcc > 0 ? 1 : -1;
      wheelAcc    = 0;
      activeIndex = Math.max(0, Math.min(cards.length - 1, activeIndex + dir));
      scrollToCard(activeIndex);
      pauseThenResume(RESUME_WHEEL_MS);
    }
  }, { passive: false });

  /* ── Touch swipe ───────────────────────────────────────── */
  let touchStartX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stopAuto();
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) {
      const dir   = dx > 0 ? 1 : -1;
      activeIndex = Math.max(0, Math.min(cards.length - 1, activeIndex + dir));
      scrollToCard(activeIndex);
    }
    pauseThenResume(RESUME_TOUCH_MS);
  }, { passive: true });

  /* ── Init ──────────────────────────────────────────────── */
  updateUI();
  scrollToCard(0, 'instant');
  startAuto();

})();
