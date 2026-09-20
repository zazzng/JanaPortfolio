/* ============================================================
   SCROLL-TO-ADVANCE — case study card stack
   ============================================================
   The peek cards are no longer clickable. Instead: land on a
   project, and once you are at the top of the page, keep
   scrolling up. The card assembly gives way, the stack fans
   open, and the next project commits.

   The gesture is deliberately resistive. Three things stop it
   from firing by accident:
     1. travel gives way asymptotically — the further you pull,
        the less each notch moves
     2. progress bleeds away the moment you stop feeding it
     3. a commit needs sustained input, not one fast flick
   ============================================================ */

(function () {
  'use strict';

  const stack = document.querySelector('.ls-stack, .fp-stack, .js-stack, .sf-stack, .tc-stack');
  if (!stack) return;

  const prefix = (stack.className.match(/([a-z]+)-stack/) || [])[1];
  if (!prefix) return;

  const main     = document.querySelector('.' + prefix + '-main');
  const nextLink = document.querySelector('.' + prefix + '-next-link');
  if (!main || !nextLink) return;

  const href     = nextLink.getAttribute('href');
  const nextName = nextLink.textContent.replace(/[→\s]+$/, '').trim();
  if (!href) return;

  /* The strips are decoration now — the gesture replaced the click.
     The "Next Project" link at the foot of the page stays as the
     keyboard and screen-reader path. */
  stack.querySelectorAll('.' + prefix + '-peek-card').forEach(function (el) {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
  });

  const ui = document.createElement('div');
  ui.className = 'stack-pull';
  ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML =
    '<span class="stack-pull__label"></span>' +
    '<span class="stack-pull__track"><span class="stack-pull__fill"></span></span>' +
    '<span class="stack-pull__hint">Keep pulling</span>';
  ui.querySelector('.stack-pull__label').textContent = 'Next — ' + nextName;
  document.body.appendChild(ui);

  const root    = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const THRESHOLD   = 820;                // accumulated intent needed to commit
  const MAX_Y       = reduced ? 20 : 104; // how far the card assembly travels
  const PER_EVENT   = 36;                 // no single flick counts for much
  const HOLD_MS     = 580;                // a commit has to be sustained
  const DECAY_AFTER = 130;                // stillness before progress bleeds
  const STIFFEN     = 0.34;               // how much harder the far end gets
  const DECAY_RATE  = 0.81;

  let pull = 0, startedAt = 0, lastFed = 0, raf = null, committed = false;
  const armedAt = Date.now() + 400;      // ignore momentum carried in from the last page

  function render() {
    const p = Math.min(1, pull / THRESHOLD);
    // asymptotic give: travel saturates well before the threshold, so the
    // last stretch is all effort and no movement — the bar keeps filling
    // even though the card has stopped giving
    const y = MAX_Y * (1 - Math.exp(-pull / (THRESHOLD * 0.42)));
    root.style.setProperty('--pull', p.toFixed(4));
    root.style.setProperty('--pull-y', y.toFixed(2) + 'px');
    ui.classList.toggle('is-armed', p > 0.995);
  }

  function tick() {
    if (committed) return;
    if (Date.now() - lastFed > DECAY_AFTER) {
      pull *= DECAY_RATE;
      if (pull < 0.5) { pull = 0; render(); raf = null; return; }
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function commit() {
    committed = true;
    if (raf) cancelAnimationFrame(raf);
    root.style.setProperty('--pull', '1');
    document.body.classList.add('stack-committing');
    setTimeout(function () { window.location.href = href; }, reduced ? 60 : 400);
  }

  function feed(amount) {
    if (committed || Date.now() < armedAt) return;
    if (pull === 0) startedAt = Date.now();
    // the further along you are, the less each notch buys you
    const stiffness = Math.max(0.35, 1 - STIFFEN * (pull / THRESHOLD));
    pull += Math.min(amount, PER_EVENT) * stiffness;
    lastFed = Date.now();
    render();
    if (pull >= THRESHOLD && Date.now() - startedAt > HOLD_MS) { commit(); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function release() {
    if (!committed && pull > 0 && !raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', function (e) {
    if (committed) return;
    // scrolling back down cancels an in-progress pull outright
    if (e.deltaY > 0) { if (pull > 0) { pull = 0; render(); } return; }
    if (window.scrollY > 0 || e.deltaY >= 0) return;
    e.preventDefault();           // eat the rubber-band, this is our gesture
    feed(-e.deltaY);
  }, { passive: false });

  let touchY = null;
  window.addEventListener('touchstart', function (e) {
    touchY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (touchY === null || committed || window.scrollY > 0) return;
    const dy = e.touches[0].clientY - touchY;
    touchY = e.touches[0].clientY;
    if (dy > 0) feed(dy * 1.2);
    else if (pull > 0) { pull = 0; render(); }
  }, { passive: true });

  window.addEventListener('touchend', function () { touchY = null; release(); }, { passive: true });
})();
