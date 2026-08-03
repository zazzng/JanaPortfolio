/* ============================================================
   CARD STACK — Layered deck interaction
   Targets existing .project-card elements inside the
   Selected Work section. No HTML structure is changed.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function initCardStack() {

  /* ── Step 1: Locate the grid directly ── */
  const grid = document.querySelector('.projects-grid');
  console.log('[CardStack] grid found:', grid);
  if (!grid) {
    console.warn('[CardStack] .projects-grid not found — aborting.');
    return;
  }

  /* Only run on the home page (grid must be inside .selected-work__header's section) */
  const header = document.querySelector('.selected-work__header');
  if (!header) {
    console.warn('[CardStack] .selected-work__header not found — not on home page, skipping.');
    return;
  }

  /* ── Step 3: Verify card count ── */
  const cards = Array.from(grid.querySelectorAll('.project-card'));
  console.log('[CardStack] cards found:', cards.length, cards);
  if (cards.length === 0) {
    console.warn('[CardStack] No .project-card elements found inside grid — aborting.');
    return;
  }

  const n = cards.length;
  let activeIndex = 0;
  let animating = false;

  /* ── Per-card theme data (indexed by DOM order) ── */
  const cardThemes = [
    {
      /* Card 0: Forgotten Pages — dusty rose */
      bg:               '#e8d8d0',
      bgArt:            '#d9c4ba',
      ink:              '#1E100A',
      ink2:             '#6B4A3C',
      inkHover:         '#0A0300',
      tagBorder:        'rgba(107,74,60,0.22)',
      peekLabel:        '"Forgotten Pages"',
      peekLabelColor:   '#6B4A3C',
      kicker:           '"✦  Forgotten Pages"',
      kickerColor:      'rgba(107,74,60,0.65)',
    },
    {
      /* Card 1: Live Space — dark forest green */
      bg:               '#1a3a35',
      bgArt:            '#122c28',
      ink:              '#E0F0E8',
      ink2:             '#88B8A8',
      inkHover:         '#ffffff',
      tagBorder:        'rgba(136,184,168,0.28)',
      peekLabel:        '"Live Space"',
      peekLabelColor:   'rgba(224,240,232,0.88)',
      kicker:           '"Live Space"',
      kickerColor:      'rgba(224,240,232,0.65)',
    },
    {
      /* Card 2: Jeon Stack — deeper forest */
      bg:               '#1f2e28',
      bgArt:            '#151f1a',
      ink:              '#C8DDD4',
      ink2:             '#6E9E8C',
      inkHover:         '#ffffff',
      tagBorder:        'rgba(110,158,140,0.28)',
      peekLabel:        '"Jeon Stack"',
      peekLabelColor:   'rgba(200,221,212,0.88)',
      kicker:           '"Jeon Stack"',
      kickerColor:      'rgba(200,221,212,0.65)',
    },
  ];

  /* ── Step 2: Apply CSS custom properties to each card ── */
  cards.forEach((card, i) => {
    const t = cardThemes[i] || cardThemes[cardThemes.length - 1];
    card.style.setProperty('--sc-bg',               t.bg);
    card.style.setProperty('--sc-bg-art',           t.bgArt);
    card.style.setProperty('--sc-ink',              t.ink);
    card.style.setProperty('--sc-ink-2',            t.ink2);
    card.style.setProperty('--sc-ink-hover',        t.inkHover);
    card.style.setProperty('--sc-tag-border',       t.tagBorder);
    card.style.setProperty('--sc-peek-label',       t.peekLabel);
    card.style.setProperty('--sc-peek-label-color', t.peekLabelColor);
    card.style.setProperty('--sc-kicker',           t.kicker);
    card.style.setProperty('--sc-kicker-color',     t.kickerColor);
    console.log('[CardStack] theme set on card', i, '→ bg:', t.bg);
  });

  /* ── Activate wrapper (triggers all scoped CSS rules) ── */
  grid.classList.add('is-stack');
  console.log('[CardStack] is-stack added. grid classList:', grid.className);

  /* ── Pre-reveal so scroll-reveal doesn't zero opacity later ── */
  cards.forEach(card => {
    card.classList.add('revealed');
    /* Also remove data-reveal attribute entirely to escape the
       [data-reveal] { opacity:0 } base rule with zero ambiguity. */
    card.removeAttribute('data-reveal');
  });

  /* ── Position logic ── */
  function applyPositions(instant) {
    if (instant) {
      cards.forEach(c => c.classList.add('no-transition'));
    }

    cards.forEach((card, i) => {
      const pos = (i - activeIndex + n) % n;
      card.dataset.pos = String(pos);
      card.tabIndex = (pos === 1 || pos === 2) ? 0 : -1;
    });

    if (instant) {
      void grid.offsetHeight; /* force synchronous reflow */
      cards.forEach(c => c.classList.remove('no-transition'));
    }
  }

  /* ── Step 4: Confirm positions are set ── */
  applyPositions(true);
  console.log('[CardStack] positions applied. data-pos values:',
    cards.map(c => c.dataset.pos));

  /* ── Bring a card to the front ── */
  function activateCard(targetIndex) {
    if (animating || targetIndex === activeIndex) return;
    animating = true;
    activeIndex = targetIndex;
    applyPositions(false);
    setTimeout(() => { animating = false; }, 460);
  }

  /* ── Interactions ── */
  cards.forEach((card, i) => {
    card.addEventListener('click', e => {
      if (card.dataset.pos !== '0') {
        e.preventDefault();
        activateCard(i);
      }
    });

    card.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && card.dataset.pos !== '0') {
        e.preventDefault();
        activateCard(i);
      }
    });
  });

  console.log('[CardStack] init complete.');
});
