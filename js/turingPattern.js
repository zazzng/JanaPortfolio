/* ============================================================
   TURING PATTERN — Gray–Scott reaction–diffusion hero background
   ============================================================ */

(() => {
  const canvas = document.getElementById('turing-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });

  const INK   = [0x1a, 0x1a, 0x18];

  // Classic Gray–Scott "coral" parameters
  const Du = 1.0;
  const Dv = 0.5;
  const FEED = 0.0545;
  const KILL = 0.062;
  const DT = 1;
  const THRESHOLD = 0.32;

  const GROW_SECONDS = 10;
  const BREATHE_SECONDS = 10;
  const FEED_AMPLITUDE = 0.0025;

  let gridW, gridH, u, v, uNext, vNext;
  let startTime = null;
  let raf = null;

  function idx(x, y) {
    if (x < 0) x += gridW; else if (x >= gridW) x -= gridW;
    if (y < 0) y += gridH; else if (y >= gridH) y -= gridH;
    return y * gridW + x;
  }

  function seed() {
    const n = gridW * gridH;
    u = new Float32Array(n).fill(1);
    v = new Float32Array(n).fill(0);
    uNext = new Float32Array(n);
    vNext = new Float32Array(n);

    const r = Math.max(4, Math.round(gridW / 45));
    const points = [[0.5, 0.5], [0.24, 0.32], [0.74, 0.62]];
    points.forEach(([fx, fy]) => {
      const cx = Math.round(fx * gridW);
      const cy = Math.round(fy * gridH);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const i = idx(x, y);
          u[i] = 0.5 + Math.random() * 0.05;
          v[i] = 0.25 + Math.random() * 0.05;
        }
      }
    });
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));

    // ~2 CSS px per cell keeps the stripe wavelength fine (matches the
    // reference's dense fingerprint texture) while staying inside the
    // per-frame compute budget for real-time animation.
    gridW = Math.min(520, Math.max(300, Math.round(cssW / 2)));
    gridH = Math.min(460, Math.max(240, Math.round(cssH / 2)));

    canvas.width = gridW;
    canvas.height = gridH;

    seed();
    startTime = null;
  }

  function step(feed) {
    for (let y = 0; y < gridH; y++) {
      const yUp = (y === 0 ? gridH - 1 : y - 1) * gridW;
      const yDn = (y === gridH - 1 ? 0 : y + 1) * gridW;
      const yC = y * gridW;
      for (let x = 0; x < gridW; x++) {
        const xL = x === 0 ? gridW - 1 : x - 1;
        const xR = x === gridW - 1 ? 0 : x + 1;
        const i = yC + x;
        const uC = u[i];
        const vC = v[i];

        const lapU =
          u[yC + xL] * 0.2 + u[yC + xR] * 0.2 + u[yUp + x] * 0.2 + u[yDn + x] * 0.2 +
          u[yUp + xL] * 0.05 + u[yUp + xR] * 0.05 + u[yDn + xL] * 0.05 + u[yDn + xR] * 0.05 -
          uC;

        const lapV =
          v[yC + xL] * 0.2 + v[yC + xR] * 0.2 + v[yUp + x] * 0.2 + v[yDn + x] * 0.2 +
          v[yUp + xL] * 0.05 + v[yUp + xR] * 0.05 + v[yDn + xL] * 0.05 + v[yDn + xR] * 0.05 -
          vC;

        const reaction = uC * vC * vC;
        uNext[i] = uC + (Du * lapU - reaction + feed * (1 - uC)) * DT;
        vNext[i] = vC + (Dv * lapV + reaction - (feed + KILL) * vC) * DT;
      }
    }
    [u, uNext] = [uNext, u];
    [v, vNext] = [vNext, v];
  }

  function render() {
    const frame = ctx.createImageData(gridW, gridH);
    const data = frame.data;
    for (let i = 0; i < gridW * gridH; i++) {
      const on = v[i] > THRESHOLD;
      const o = i * 4;
      if (on) {
        data[o] = INK[0];
        data[o + 1] = INK[1];
        data[o + 2] = INK[2];
        data[o + 3] = 255;
      } else {
        data[o] = 0;
        data[o + 1] = 0;
        data[o + 2] = 0;
        data[o + 3] = 0;
      }
    }
    ctx.putImageData(frame, 0, 0);
  }

  function loop(ts) {
    if (startTime === null) startTime = ts;
    const elapsed = (ts - startTime) / 1000;

    const growth = Math.min(elapsed / GROW_SECONDS, 1);
    const iterations = 6 + Math.round(growth * 4);

    const breathe = elapsed > GROW_SECONDS
      ? Math.sin(((elapsed - GROW_SECONDS) / BREATHE_SECONDS) * Math.PI * 2) * FEED_AMPLITUDE
      : 0;

    for (let s = 0; s < iterations; s++) step(FEED + breathe);
    render();

    raf = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(loop);
    }, 200);
  });

  resize();
  raf = requestAnimationFrame(loop);
})();
