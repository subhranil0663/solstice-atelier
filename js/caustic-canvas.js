/**
 * SOLSTICE ATELIER | Caustic Light-Refraction Canvas Engine
 * Simulates optical refraction through hand-cast sculpted acoustic lenses.
 * Responsive to cursor velocity, with chromatic dispersion and smooth dissipation.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('causticCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationId = null;

  // Caustic optical wave grid simulation
  const COLS = 64;
  const ROWS = 40;
  let heightMap = new Float32Array(COLS * ROWS);
  let velocityMap = new Float32Array(COLS * ROWS);

  // Mouse interaction state
  let lastMouseX = -1;
  let lastMouseY = -1;
  let lastTime = performance.now();
  let cursorVelocity = 0;
  let isInteracting = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
  }

  // Inject kinetic energy into wave grid at (x, y) based on velocity
  function injectDisturbance(x, y, strength) {
    const normX = x / width;
    const normY = y / height;
    const gridX = Math.floor(normX * COLS);
    const gridY = Math.floor(normY * ROWS);

    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = gridX + dx;
        const gy = gridY + dy;
        if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
          const dist = Math.hypot(dx, dy);
          if (dist <= radius) {
            const factor = (1 - dist / radius) * strength * 0.45;
            heightMap[gy * COLS + gx] += factor;
          }
        }
      }
    }
  }

  // Update wave height physics
  function updatePhysics(dt) {
    const damping = 0.965;
    const waveSpeed = 0.28;

    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const idx = y * COLS + x;
        const laplacian =
          heightMap[idx - 1] +
          heightMap[idx + 1] +
          heightMap[idx - COLS] +
          heightMap[idx + COLS] -
          4 * heightMap[idx];

        velocityMap[idx] += laplacian * waveSpeed;
        velocityMap[idx] *= damping;
      }
    }

    for (let i = 0; i < COLS * ROWS; i++) {
      heightMap[i] += velocityMap[i];
    }
  }

  // Render optical caustic refraction lines and light bands
  function render(timestamp) {
    ctx.clearRect(0, 0, width, height);

    // Subtle background tone matching gallery light
    ctx.fillStyle = '#F5F3EE';
    ctx.fillRect(0, 0, width, height);

    const t = timestamp * 0.001;

    // Ambient rippling if idle
    if (!isInteracting && !prefersReducedMotion.matches) {
      const ambientX = width * (0.5 + 0.3 * Math.sin(t * 0.6));
      const ambientY = height * (0.45 + 0.25 * Math.cos(t * 0.4));
      injectDisturbance(ambientX, ambientY, 0.04);
    }

    if (!prefersReducedMotion.matches) {
      updatePhysics(16);
    }

    // Render refracted light rays and caustic filament network
    const cellW = width / (COLS - 1);
    const cellH = height / (ROWS - 1);

    // Draw chromatic caustic refraction filaments
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    // Prismatic chromatic pass: Red (vermilion) and Blue (cobalt) refraction bands
    const passes = [
      { color: 'rgba(217, 56, 30, 0.16)', offset: 1.5 },  // Vermilion optical edge
      { color: 'rgba(20, 40, 160, 0.22)', offset: -1.5 }, // Deep cobalt caustic band
      { color: 'rgba(18, 19, 22, 0.08)',  offset: 0 }     // Architectural ink shadow
    ];

    for (let p = 0; p < passes.length; p++) {
      const pass = passes[p];
      ctx.strokeStyle = pass.color;

      for (let y = 1; y < ROWS - 2; y += 2) {
        ctx.beginPath();
        let started = false;

        for (let x = 1; x < COLS - 1; x++) {
          const idx = y * COLS + x;
          const h = heightMap[idx];

          // Compute gradients (surface normal tilt)
          const gradX = (heightMap[idx + 1] - heightMap[idx - 1]) * 45;
          const gradY = (heightMap[idx + COLS] - heightMap[idx - COLS]) * 45;

          // Natural lens curvature (elliptical acoustic glass contour)
          const cx = (x / (COLS - 1) - 0.5) * 2;
          const cy = (y / (ROWS - 1) - 0.5) * 2;
          const lensCurvature = Math.sin((cx * cx + cy * cy) * Math.PI * 0.8) * 12;

          const px = x * cellW + gradX + pass.offset;
          const py = y * cellH + gradY + lensCurvature;

          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }
    }

    // Render localized optical caustic highlights (focal hotspots)
    for (let y = 2; y < ROWS - 2; y += 3) {
      for (let x = 2; x < COLS - 2; x += 3) {
        const idx = y * COLS + x;
        const h = Math.abs(heightMap[idx]);
        if (h > 0.08) {
          const px = x * cellW;
          const py = y * cellH;
          const radius = Math.min(h * 35, 45);

          const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
          grad.addColorStop(0, 'rgba(217, 56, 30, 0.25)'); // Vermilion focus
          grad.addColorStop(0.5, 'rgba(20, 40, 160, 0.12)'); // Cobalt halo
          grad.addColorStop(1, 'rgba(245, 243, 238, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (!prefersReducedMotion.matches) {
      animationId = requestAnimationFrame(render);
    }
  }

  // Mouse Move Event Listener tracking cursor velocity
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();

    if (lastMouseX >= 0) {
      const dx = x - lastMouseX;
      const dy = y - lastMouseY;
      const dt = Math.max(now - lastTime, 10);
      const dist = Math.hypot(dx, dy);
      cursorVelocity = Math.min(dist / dt * 25, 2.8);

      injectDisturbance(x, y, cursorVelocity);
    }

    lastMouseX = x;
    lastMouseY = y;
    lastTime = now;
    isInteracting = true;

    clearTimeout(window.__causticTimeout);
    window.__causticTimeout = setTimeout(function () {
      isInteracting = false;
      lastMouseX = -1;
      lastMouseY = -1;
    }, 1800);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0]);
      }
    }, { passive: true });

    if (prefersReducedMotion.matches) {
      // Draw single stationary frame
      render(0);
    } else {
      animationId = requestAnimationFrame(render);
    }

    prefersReducedMotion.addEventListener('change', function (e) {
      if (e.matches) {
        if (animationId) cancelAnimationFrame(animationId);
        render(0);
      } else {
        animationId = requestAnimationFrame(render);
      }
    });
  }

  init();
})();
