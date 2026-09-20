/* ============================================================
   PROJECT CAROUSEL — home page
   ============================================================
   A horizontal, centre-snapping scroller. The project in the
   middle of the screen is the active one: full opacity and
   full size, with its neighbours dimmed and scaled back.

   It runs as a closed circle — 0 1 2 3 4 0 1 2 3 4 … — always
   forwards, never rewinding. That is done by cloning a couple
   of slides onto each end so there is always something in the
   peek positions, gliding into a clone, then silently jumping
   to its real twin once the movement settles. The clone and
   the original look identical, so the seam is invisible.

   Built on native overflow scrolling + scroll-snap, so swipe,
   trackpad and keyboard all work without custom drag code.
   ============================================================ */

(function () {
  'use strict';

  const root = document.querySelector('[data-carousel]');
  if (!root) return;

  const track = root.querySelector('.carousel__track');
  const dotsWrap = root.querySelector('.carousel__dots');
  if (!track) return;

  const real = Array.prototype.slice.call(track.children);
  const COUNT = real.length;
  if (COUNT < 2) return;

  /* enough copies to fill the peek slots on either side */
  const PAD = Math.min(2, COUNT);

  /* "Reduce motion" removes the sliding animation — each change snaps
     into place instead — but the carousel still advances. Stopping it
     outright made the page look broken for anyone with that OS setting
     switched on, and the dots and hover-pause already give a way
     to hold it still. */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* AUTO_MS is how long each project sits before moving on.
     RESUME_MS is short on purpose: the carousel should pick back up
     almost immediately once you let go. */
  const AUTO_MS   = 1800;
  const RESUME_MS = 1500;
  const SETTLE_MS = 140;    /* quiet period that counts as "scrolling stopped" */

  /* ---- build the loop: [tail clones][originals][head clones] ---- */
  function cloneOf(node) {
    const c = node.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');   /* screen readers read the originals only */
    c.setAttribute('tabindex', '-1');        /* and tab order skips the duplicates */
    c.dataset.clone = '1';
    return c;
  }
  real.slice(-PAD).reverse().forEach(function (n) { track.insertBefore(cloneOf(n), track.firstChild); });
  real.slice(0, PAD).forEach(function (n) { track.appendChild(cloneOf(n)); });

  const all = Array.prototype.slice.call(track.children);
  const OFFSET = PAD;                        /* array index of real slide 0 */

  let pos = OFFSET, timer = null, resumeTimer = null, settleTimer = null;
  let raf = null, programmatic = false;

  function realOf(p) { return ((p - OFFSET) % COUNT + COUNT) % COUNT; }

  /* ---- dots: one per real project, clones don't get their own ---- */
  const dots = real.map(function (slide, i) {
    const title = slide.querySelector('.work-item__title');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel__dot';
    dot.setAttribute('aria-label', title ? 'Show ' + title.textContent.trim() : 'Show project ' + (i + 1));
    dot.addEventListener('click', function () { stop(); goTo(OFFSET + i); resumeSoon(); });
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  /* ---- position ---- */
  function centreOf(el) { return el.offsetLeft + el.offsetWidth / 2; }

  function goTo(p, behavior) {
    pos = p;
    /* our own move — settle must not re-derive pos from a glide that is
       still in flight, or it reads an intermediate slide and skips one */
    programmatic = true;
    track.scrollTo({
      left: Math.max(0, centreOf(all[pos]) - track.clientWidth / 2),
      behavior: behavior || (reduced ? 'instant' : 'smooth')
    });
  }

  function nearestPos() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    all.forEach(function (s, i) {
      const d = Math.abs(centreOf(s) - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function paint() {
    const p = nearestPos();
    all.forEach(function (s, i) { s.classList.toggle('is-active', i === p); });
    const r = realOf(p);
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === r);
      d.setAttribute('aria-current', i === r ? 'true' : 'false');
    });
  }

  /* Once movement stops, if we have drifted onto a clone, hop to the real
     slide it copies. Identical pixels on screen, so nothing is seen — this
     is what makes the loop closed instead of rewinding.

     The hop must be 'instant', not 'auto'. 'auto' defers to the CSS
     scroll-behavior, which is smooth on this track, so the jump would
     animate backwards across the whole strip in full view. */
  function onSettle() {
    if (programmatic) {
      programmatic = false;          /* pos is already correct */
    } else {
      pos = nearestPos();            /* a wheel or swipe moved it */
    }
    if (pos >= OFFSET + COUNT || pos < OFFSET) {
      goTo(pos >= OFFSET + COUNT ? pos - COUNT : pos + COUNT, 'instant');
      paint();
    }
  }

  /* ---- auto-advance, always forwards ---- */
  function start() {
    if (timer) return;
    timer = setInterval(function () { goTo(pos + 1); }, AUTO_MS);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    /* also drop any queued restart, or a resume scheduled before the
       pointer arrived could start it up again mid-hover */
    clearTimeout(resumeTimer);
  }
  function resumeSoon() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(start, RESUME_MS);
  }

  track.addEventListener('scroll', function () {
    if (!raf) raf = requestAnimationFrame(function () { paint(); raf = null; });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, SETTLE_MS);
  }, { passive: true });

  /* a vertical wheel should walk the carousel sideways */
  root.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if (track.scrollWidth <= track.clientWidth) return;
    e.preventDefault();
    stop();
    track.scrollBy({ left: e.deltaY * 2.4, behavior: 'instant' });
    resumeSoon();
  }, { passive: false });

  /* Hover pauses per CARD, not on the whole carousel. The carousel spans
     ~60% of the viewport, so pausing on the container would freeze it for
     any cursor resting near the middle of the screen. Landing on a project
     holds it (and opens that card's detail); leaving lets it carry on. */
  all.forEach(function (slide) {
    slide.addEventListener('pointerenter', stop);
    slide.addEventListener('pointerleave', resumeSoon);
  });

  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', resumeSoon);

  /* a drag or swipe counts as interaction */
  track.addEventListener('pointerdown', function () { stop(); });
  track.addEventListener('pointerup', resumeSoon);
  track.addEventListener('touchstart', function () { stop(); }, { passive: true });
  track.addEventListener('touchend', resumeSoon, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else resumeSoon();
  });

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { goTo(pos, 'instant'); }, 120);
  });

  goTo(OFFSET, 'instant');
  paint();
  start();
})();
