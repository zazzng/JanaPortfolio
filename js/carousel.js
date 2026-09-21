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

   Built on native overflow scrolling + scroll-snap, so a two-finger
   trackpad swipe works on its own without any custom drag code. A
   vertical wheel is deliberately left to the page: moving sideways is
   asked for with the arrows, the dots, or the arrow keys.
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

  /* Enough copies to fill the peek slots on either side. The fan shows
     five or six cards out from the middle, not the two the old flat row
     did, so the padding has to reach further or the end of the strip
     drifts into view. Capped at COUNT because the wrap in onSettle()
     folds an index back by exactly one lap. */
  const PAD = Math.min(COUNT, 4);

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
    dot.addEventListener('click', function () { stop(); glide(OFFSET + i); resumeSoon(); });
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  /* ---- position ----
     Slide centres are measured once and cached. They only move when the
     track is re-laid out, and reading offsetLeft/offsetWidth per slide on
     every scroll frame — which is what nearestPos() does while a swipe or
     a glide is in flight — forces a synchronous layout each time. */
  let centres = [];
  let viewHalf = 0;
  let maxScroll = 0;
  let cardStep = 1;          /* centre-to-centre distance between two cards */

  /* ---- the fan ----
     Each card is turned on its vertical axis and pushed back along z by
     how far it sits from the middle, measured in cards. Depth does most
     of the work: under the track's perspective, pushing a card back
     shrinks it AND draws it in toward the vanishing point, which is
     why the row tightens toward the edges on its own without any
     hand-written spacing. The turn saturates one card out, so the whole
     shelf reads at one consistent angle rather than curling further and
     further round — every card off centre is angled back toward the
     middle by the same amount, like a row of records leaning in a crate. */
  let cfAngle = 38;          /* degrees of turn once a card is off centre */
  let cfDepth = 115;         /* pixels pushed back per card out from the middle */
  let cfLoss  = 0;           /* width a turned card gives up, in pixels */
  const CF_FADE  = 0.30;     /* opacity lost per card out */
  const CF_FAR   = 2.6;      /* past this a card stops taking the pointer */
  const CF_LIMIT = 6;        /* stop deepening past this, or far cards vanish to a point */

  function measure() {
    centres = all.map(function (s) { return s.offsetLeft + s.offsetWidth / 2; });
    viewHalf = track.clientWidth / 2;
    maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    cardStep = (centres[1] - centres[0]) || all[0].offsetWidth || 1;

    /* On a narrow screen a card is most of the width, so the same turn
       and depth would throw its neighbours right off the edge. Ease both
       back until the fan is a hint rather than a splay. */
    const tight = track.clientWidth < 700;
    cfAngle = tight ? 26 : 38;
    cfDepth = tight ? 70 : 115;
    /* A turned card covers less ground than a flat one — cos(angle) of its
       own width — so every seam opens up by the width its two cards gave
       up, and the shelf drifts apart the further out you look. Each card
       is drawn back toward the middle by exactly what has been lost
       between it and the centre, which leaves every seam equal to the
       track's own gap. See the shift in project(). */
    cfLoss = (1 - Math.cos(cfAngle * Math.PI / 180)) * (all[0].offsetWidth || 0);
    lastCf.length = 0;       /* every card has to be laid out afresh */
  }

  function targetAt(p) { return clamp(centres[p] - viewHalf); }

  function clamp(x) { return Math.max(0, Math.min(maxScroll, x)); }

  /* Instant reposition. Deliberately not behavior:'instant' — Safari only
     learned that keyword in 15.4, and older WebKit chokes on an unknown
     behavior value. Turning the CSS scroll-behavior off around a plain
     scrollLeft assignment does the same job in every browser. */
  function jump(p) {
    if (centres[p] === undefined) return;  /* never index past the track */
    pos = p;
    programmatic = true;
    const prev = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = targetAt(p);
    track.style.scrollBehavior = prev;
  }

  /* Animated move. */
  function glide(p) {
    if (centres[p] === undefined) return;  /* never index past the track */
    if (reduced) { jump(p); return; }
    pos = p;
    /* our own move — settle must not re-derive pos from a glide that is
       still in flight, or it reads an intermediate slide and skips one */
    programmatic = true;
    track.scrollTo({ left: targetAt(p), behavior: 'smooth' });
  }

  function nearestPos() {
    const mid = track.scrollLeft + viewHalf;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < centres.length; i++) {
      const d = Math.abs(centres[i] - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /* Lay the fan out for the current scroll position. Runs on every scroll
     frame, so it writes as little as it can: values are rounded and kept,
     and a card whose numbers have not changed is left alone entirely.

     z-index is set by hand because the track clips its overflow, which
     flattens it — without this the browser would paint the cards in DOM
     order and the right-hand side of the fan would sit on top of the
     middle instead of behind it. */
  const lastCf = [];

  function project(mid) {
    for (let i = 0; i < all.length; i++) {
      const off = (centres[i] - mid) / cardStep;      /* distance out, in cards */
      const away = Math.min(Math.abs(off), CF_LIMIT);

      /* A card left of centre turns its OUTER edge toward you and its
         inner edge away, so its face angles back in toward the middle —
         records leaning in a crate, each one turned to face the person
         standing at the centre. The opposite sign gives a book held open
         toward you, which splays the wrong way. */
      const rot  = Math.round(Math.max(-1, Math.min(1, off)) * cfAngle * 10) / 10;
      const z    = Math.round(-away * cfDepth);
      /* The centre card is not turned and so gives up nothing; the cards
         either side of it lose only the half that faces inward. Hence the
         half-card head start — pulling by the full amount from the first
         card out is what jammed the neighbours flush against the middle
         while the seams further out stayed wide open. */
      const x    = Math.round(-Math.sign(off) * Math.max(0, Math.abs(off) - 0.5) * cfLoss);
      const fade = Math.round(Math.max(0, 1 - away * CF_FADE) * 100) / 100;
      const key  = rot + '|' + z + '|' + x + '|' + fade;
      if (lastCf[i] === key) continue;
      lastCf[i] = key;

      const s = all[i];
      s.style.setProperty('--cf-rot', rot + 'deg');
      s.style.setProperty('--cf-z', z + 'px');
      s.style.setProperty('--cf-x', x + 'px');
      s.style.setProperty('--cf-fade', fade);
      s.style.zIndex = String(100 - Math.round(away * 10));
      s.classList.toggle('is-far', Math.abs(off) > CF_FAR);
    }
  }

  function paint() {
    const mid = track.scrollLeft + viewHalf;
    project(mid);

    let p = 0, bestDist = Infinity;
    for (let i = 0; i < centres.length; i++) {
      const d = Math.abs(centres[i] - mid);
      if (d < bestDist) { bestDist = d; p = i; }
    }

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

     The hop must bypass the CSS scroll-behavior, which is smooth on this
     track — otherwise it animates backwards across the whole strip in
     full view. See jump() for how that is done portably. */
  function onSettle() {
    if (programmatic) {
      programmatic = false;          /* pos is already correct */
    } else {
      /* A free swipe ended wherever the finger left it. This is the snap
         the CSS no longer does: take the nearest card and glide it to the
         middle. The clone fold below waits for the next settle, after that
         glide has finished, so the seam is never crossed mid-movement. */
      pos = nearestPos();
      if (Math.abs(track.scrollLeft - targetAt(pos)) > 1) { glide(pos); return; }
    }
    if (pos >= OFFSET + COUNT || pos < OFFSET) {
      jump(pos >= OFFSET + COUNT ? pos - COUNT : pos + COUNT);
      paint();
      return;                        /* the jump lands exactly on centre */
    }

    /* The last word on where things stop. Whatever happened on the way here
       — a glide cut short, the track changing width mid-flight, a wrap
       racing a scroll still in the air — the card we call the middle one
       has to actually BE in the middle once everything is still.
       Re-measure first: stale geometry is the usual reason it drifted. */
    if (Math.abs(track.scrollLeft - targetAt(pos)) > 1) {
      measure();
      jump(pos);
      paint();
    }
  }

  /* ---- auto-advance, always forwards ---- */
  function start() {
    if (timer) return;
    timer = setInterval(function () {
      /* If we are parked on a clone, hop to its twin first. This is what
         closes the loop, and it no longer depends on the settle handler
         having run — if scroll events never settle (Safari), the index
         still stays in range instead of walking off the end of the track
         and handing an undefined element to centreOf(). */
      if (pos >= OFFSET + COUNT) jump(pos - COUNT);
      else if (pos < OFFSET) jump(pos + COUNT);
      glide(pos + 1);
    }, AUTO_MS);
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

  /* ---- arrows ----
     A vertical wheel is left alone: it scrolls the page, as it does
     everywhere else. Sideways movement is asked for explicitly — the
     arrows, the dots, or a two-finger swipe, which the browser handles
     itself through the track's own horizontal overflow.

     Stepping starts from a real slide. If we are parked on a clone the
     index is folded back onto its twin first, so a press always advances
     by exactly one project and never walks off the end of the strip. */
  function step(dir) {
    stop();
    if (pos >= OFFSET + COUNT) jump(pos - COUNT);
    else if (pos < OFFSET)     jump(pos + COUNT);
    glide(pos + dir);
    resumeSoon();
  }

  const prevBtn = root.querySelector('[data-carousel-prev]');
  const nextBtn = root.querySelector('[data-carousel-next]');
  if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

  /* left/right keys drive it too once the carousel has focus */
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')       { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  /* A card that is not in the middle is a poor target: it is turned away,
     foreshortened and part-hidden by its neighbours, so a click on one is
     far more likely to mean "bring that one round" than "open it". Only
     the card facing you opens its project. */
  all.forEach(function (slide, i) {
    slide.addEventListener('click', function (e) {
      if (slide.classList.contains('is-active')) return;   /* centred: let the link work */
      e.preventDefault();
      stop();
      /* Glide straight to the card that was clicked, wherever in the strip
         it sits — including a clone, which onSettle folds onto its twin
         once the movement stops. Normalising the index first would
         teleport the shelf out from under the cursor. */
      glide(i);
      resumeSoon();
    });
  });

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
  function relayout() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { measure(); jump(pos); paint(); }, 120);
  }
  window.addEventListener('resize', relayout);

  /* The track can change width without the window ever resizing: a classic
     scrollbar appearing the moment the page grows past a screenful, a
     webfont landing, a parent being relaid out, the browser zooming.
     window.resize reports none of those, and each one leaves the measured
     card positions stale — which is what puts the middle card off to one
     side. So watch the element itself, not the window. */
  if (window.ResizeObserver) {
    let seenFirst = false;
    new ResizeObserver(function () {
      if (!seenFirst) { seenFirst = true; return; }   /* first call is just the current size */
      relayout();
    }).observe(track);
  }

  /* Type metrics can shift the track after everything else has settled. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); jump(pos); paint(); });
  }

  measure();
  jump(OFFSET);
  paint();
  start();

  /* late-loading artwork or fonts can shift the track, so take the
     measurements again once everything has landed */
  window.addEventListener('load', function () { measure(); jump(pos); });
})();
