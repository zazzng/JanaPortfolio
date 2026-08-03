(function () {
  const stackEl = document.getElementById('cardStack');
  if (!stackEl) return;

  const cards = Array.from(stackEl.querySelectorAll('.stack-card'));
  const dots  = Array.from(document.querySelectorAll('.stack-dot'));
  let offset = 0;
  let locked = false;

  function update() {
    cards.forEach(function (card, i) {
      const pos = i - offset;
      if      (pos < 0)  card.dataset.pos = 'past';
      else if (pos === 0) card.dataset.pos = 'front';
      else if (pos === 1) card.dataset.pos = 'mid';
      else if (pos === 2) card.dataset.pos = 'back';
      else               card.dataset.pos = 'incoming';
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === offset);
    });
  }

  function advance(dir) {
    if (locked) return;
    var next = offset + dir;
    if (next < 0 || next >= cards.length) return;
    offset = next;
    locked = true;
    update();
    setTimeout(function () { locked = false; }, 520);
  }

  /* Wheel */
  stackEl.addEventListener('wheel', function (e) {
    e.preventDefault();
    advance(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  /* Touch */
  var touchStartY = 0;
  stackEl.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  stackEl.addEventListener('touchend', function (e) {
    var dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 30) advance(dy > 0 ? 1 : -1);
  }, { passive: true });

  /* Keyboard (when stack is focused) */
  stackEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); advance(1); }
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  { e.preventDefault(); advance(-1); }
  });

  update();
}());
