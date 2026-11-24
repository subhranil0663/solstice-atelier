/**
 * SOLSTICE ATELIER | Resonance Lab Engine
 * Interactive acoustic modal simulation & Web Audio harmonic synthesizer.
 * Calculates axial/tangential room eigenmodes, renders standing wave pressure field,
 * and synthesizes material-damped acoustic harmonics.
 */

(function () {
  'use strict';

  // DOM Elements
  const canvas = document.getElementById('standingWaveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const lengthSlider = document.getElementById('sliderLength');
  const widthSlider = document.getElementById('sliderWidth');
  const heightSlider = document.getElementById('sliderHeight');
  const freqSlider = document.getElementById('sliderFreq');

  const lengthValEl = document.getElementById('valLength');
  const widthValEl = document.getElementById('valWidth');
  const heightValEl = document.getElementById('valHeight');
  const freqValEl = document.getElementById('valFreq');

  const materialButtons = document.querySelectorAll('.material-btn');
  const materialDescEl = document.getElementById('materialDesc');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const probeReadoutEl = document.getElementById('probeReadout');
  const modalModeEl = document.getElementById('modalMode');
  const schroederFreqEl = document.getElementById('schroederFreq');
  const roomVolumeEl = document.getElementById('roomVolume');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Simulation Parameters
  const state = {
    length: 8.4,  // meters
    width: 5.6,   // meters
    height: 3.8,  // meters
    freq: 110,    // Hz (A2)
    material: 'cedar',
    isPlaying: false,
    probe: { x: 0.5, y: 0.5 },
    time: 0
  };

  const materials = {
    cedar: {
      name: 'Kyoto cedar',
      absorption: 0.18,
      harmonic2: 0.55,
      harmonic3: 0.22,
      cutoff: 950,
      description: 'Warm organic boundary absorption; dampens flutter echoes while enriching low mid-range harmonic overtone warmth.'
    },
    basalt: {
      name: 'Basalt stone',
      absorption: 0.04,
      harmonic2: 0.35,
      harmonic3: 0.15,
      cutoff: 1800,
      description: 'Dense architectural mass; specular reflections with minimal wall compliance for ultra-precise low frequency articulation.'
    },
    glass: {
      name: 'Cast optical glass',
      absorption: 0.08,
      harmonic2: 0.65,
      harmonic3: 0.45,
      cutoff: 3400,
      description: 'Curved hand-cast lenses; specular high-frequency diffusion without specular flutter, imparting crystalline clarity.'
    }
  };

  // Web Audio Context & Nodes
  let audioCtx = null;
  let osc1 = null;
  let osc2 = null;
  let osc3 = null;
  let filterNode = null;
  let masterGain = null;
  let gain1 = null;
  let gain2 = null;
  let gain3 = null;

  function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);

    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(materials[state.material].cutoff, audioCtx.currentTime);

    // Fundamental oscillator
    osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(state.freq, audioCtx.currentTime);
    gain1 = audioCtx.createGain();
    gain1.gain.setValueAtTime(0.65, audioCtx.currentTime);
    osc1.connect(gain1);
    gain1.connect(filterNode);

    // 2nd harmonic (octave)
    osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(state.freq * 2, audioCtx.currentTime);
    gain2 = audioCtx.createGain();
    gain2.gain.setValueAtTime(materials[state.material].harmonic2 * 0.35, audioCtx.currentTime);
    osc2.connect(gain2);
    gain2.connect(filterNode);

    // 3rd harmonic (octave + fifth)
    osc3 = audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(state.freq * 3, audioCtx.currentTime);
    gain3 = audioCtx.createGain();
    gain3.gain.setValueAtTime(materials[state.material].harmonic3 * 0.2, audioCtx.currentTime);
    osc3.connect(gain3);
    gain3.connect(filterNode);

    filterNode.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc3.start();
  }

  function updateAudioParams() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const mat = materials[state.material];

    osc1.frequency.setTargetAtTime(state.freq, now, 0.04);
    osc2.frequency.setTargetAtTime(state.freq * 2, now, 0.04);
    osc3.frequency.setTargetAtTime(state.freq * 3, now, 0.04);

    gain2.gain.setTargetAtTime(mat.harmonic2 * 0.35, now, 0.05);
    gain3.gain.setTargetAtTime(mat.harmonic3 * 0.2, now, 0.05);
    filterNode.frequency.setTargetAtTime(mat.cutoff, now, 0.05);
  }

  function toggleAudio() {
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    state.isPlaying = !state.isPlaying;
    const now = audioCtx.currentTime;

    if (state.isPlaying) {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.18, now + 0.08); // Comfortable gentle volume
      audioToggleBtn.classList.add('playing');
      audioToggleBtn.setAttribute('aria-pressed', 'true');
      const label = audioToggleBtn.querySelector('.audio-btn-label');
      if (label) label.textContent = 'Mute acoustic tone';
    } else {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      audioToggleBtn.classList.remove('playing');
      audioToggleBtn.setAttribute('aria-pressed', 'false');
      const label = audioToggleBtn.querySelector('.audio-btn-label');
      if (label) label.textContent = 'Play acoustic tone';
    }
  }

  // Calculate room acoustics metrics
  function updateAcousticMetrics() {
    const c = 343; // speed of sound (m/s)
    const vol = state.length * state.width * state.height;
    if (roomVolumeEl) roomVolumeEl.textContent = vol.toFixed(1) + ' m³';

    // Schroeder Frequency: fs ≈ 2000 * sqrt(T60 / V)
    // Sabine reverberation estimate: T60 = 0.161 * V / (S * alpha)
    const surfaceArea = 2 * (state.length * state.width + state.length * state.height + state.width * state.height);
    const alpha = materials[state.material].absorption;
    const t60 = Math.max(0.161 * vol / (surfaceArea * alpha), 0.25);
    const schroeder = 2000 * Math.sqrt(t60 / vol);
    if (schroederFreqEl) schroederFreqEl.textContent = Math.round(schroeder) + ' Hz';

    // Axial mode indices for current frequency
    const nx = Math.round((2 * state.freq * state.length) / c);
    const ny = Math.round((2 * state.freq * state.width) / c);
    if (modalModeEl) modalModeEl.textContent = `Mode (${nx}, ${ny}, 0)`;

    // Calculate probe pressure
    const px = state.probe.x * state.length;
    const py = state.probe.y * state.width;
    const pressure = Math.abs(Math.cos(nx * Math.PI * px / state.length) * Math.cos(ny * Math.PI * py / state.width));
    const dbSpl = (68 + pressure * 26).toFixed(1);
    let zoneDesc = 'Linear diffusion zone';
    if (pressure > 0.8) zoneDesc = 'Pressure antinode (peak)';
    else if (pressure < 0.2) zoneDesc = 'Nodal null (quiet)';

    if (probeReadoutEl) {
      probeReadoutEl.textContent = `${dbSpl} dB SPL (${zoneDesc})`;
    }
  }

  // Canvas Rendering
  let canvasW = 0;
  let canvasH = 0;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    ctx.scale(dpr, dpr);
  }

  function renderModalCanvas() {
    ctx.clearRect(0, 0, canvasW, canvasH);

    const c = 343;
    const nx = Math.max(1, Math.round((2 * state.freq * state.length) / c));
    const ny = Math.max(1, Math.round((2 * state.freq * state.width) / c));
    const omega = 2 * Math.PI * (state.freq > 180 ? 3 : 1.5);
    const wavePhase = prefersReducedMotion.matches ? 0 : Math.sin(state.time * 0.003 * omega);

    // Draw 2D isobaric modal pressure map
    const gridCols = 48;
    const gridRows = 32;
    const cellW = canvasW / gridCols;
    const cellH = canvasH / gridRows;

    for (let r = 0; r < gridRows; r++) {
      const normY = r / gridRows;
      const termY = Math.cos(ny * Math.PI * normY);

      for (let cCol = 0; cCol < gridCols; cCol++) {
        const normX = cCol / gridCols;
        const termX = Math.cos(nx * Math.PI * normX);
        const p = termX * termY * (0.8 + 0.2 * wavePhase);
        const absP = Math.abs(p);

        // Color blocking: Vermilion antinodes, deep cobalt nodal planes
        if (p > 0.1) {
          // Positive pressure zone: warm vermilion/amber luminescence
          ctx.fillStyle = `rgba(217, 56, 30, ${absP * 0.72})`;
        } else if (p < -0.1) {
          // Negative pressure zone: deep indigo/cyan interference
          ctx.fillStyle = `rgba(45, 69, 216, ${absP * 0.65})`;
        } else {
          // Nodal null quiet line
          ctx.fillStyle = 'rgba(13, 28, 117, 0.4)';
        }

        ctx.fillRect(cCol * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Overlay architectural room boundary and acoustic glass diffuser lines
    ctx.strokeStyle = 'rgba(245, 243, 238, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, canvasW - 2, canvasH - 2);

    // Cast glass acoustic lens diffuser arcs along the side walls
    ctx.strokeStyle = 'rgba(245, 243, 238, 0.5)';
    ctx.lineWidth = 1.5;
    const arcCount = 6;
    for (let i = 0; i < arcCount; i++) {
      const x = ((i + 0.5) / arcCount) * canvasW;
      // Top wall lens
      ctx.beginPath();
      ctx.arc(x, 0, 16, 0, Math.PI);
      ctx.stroke();

      // Bottom wall lens
      ctx.beginPath();
      ctx.arc(x, canvasH, 16, Math.PI, 0);
      ctx.stroke();
    }

    // Draw acoustic probe cursor
    const probePx = state.probe.x * canvasW;
    const probePy = state.probe.y * canvasH;

    // Crosshairs
    ctx.strokeStyle = 'rgba(245, 243, 238, 0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(probePx, 0);
    ctx.lineTo(probePx, canvasH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, probePy);
    ctx.lineTo(canvasW, probePy);
    ctx.stroke();

    ctx.setLineDash([]);

    // Probe marker (vermilion target ring)
    ctx.fillStyle = '#D9381E';
    ctx.beginPath();
    ctx.arc(probePx, probePy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(probePx, probePy, 9, 0, Math.PI * 2);
    ctx.stroke();

    state.time += 16;
    if (!prefersReducedMotion.matches) {
      requestAnimationFrame(renderModalCanvas);
    }
  }

  // Pointer interaction on canvas (moving acoustic probe)
  function handleCanvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    state.probe.x = x / rect.width;
    state.probe.y = y / rect.height;

    updateAcousticMetrics();
    if (prefersReducedMotion.matches) {
      renderModalCanvas();
    }
  }

  // Initialize event listeners
  function initListeners() {
    resizeCanvas();
    window.addEventListener('resize', function () {
      resizeCanvas();
      if (prefersReducedMotion.matches) renderModalCanvas();
    });

    // Sliders
    lengthSlider.addEventListener('input', function (e) {
      state.length = parseFloat(e.target.value);
      lengthValEl.textContent = state.length.toFixed(1) + ' m';
      updateAcousticMetrics();
    });

    widthSlider.addEventListener('input', function (e) {
      state.width = parseFloat(e.target.value);
      widthValEl.textContent = state.width.toFixed(1) + ' m';
      updateAcousticMetrics();
    });

    heightSlider.addEventListener('input', function (e) {
      state.height = parseFloat(e.target.value);
      heightValEl.textContent = state.height.toFixed(1) + ' m';
      updateAcousticMetrics();
    });

    freqSlider.addEventListener('input', function (e) {
      state.freq = parseInt(e.target.value, 10);
      freqValEl.textContent = state.freq + ' Hz';
      updateAcousticMetrics();
      updateAudioParams();
    });

    // Material Switcher
    materialButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        materialButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.material = btn.getAttribute('data-material');
        if (materialDescEl) {
          materialDescEl.textContent = materials[state.material].description;
        }
        updateAcousticMetrics();
        updateAudioParams();
      });
    });

    // Audio Toggle
    audioToggleBtn.addEventListener('click', toggleAudio);

    // Canvas Probe Listeners
    canvas.addEventListener('mousedown', handleCanvasPointer);
    canvas.addEventListener('mousemove', function (e) {
      if (e.buttons === 1) handleCanvasPointer(e);
    });
    canvas.addEventListener('click', handleCanvasPointer);

    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        handleCanvasPointer(e.touches[0]);
      }
    }, { passive: true });

    updateAcousticMetrics();

    if (prefersReducedMotion.matches) {
      renderModalCanvas();
    } else {
      requestAnimationFrame(renderModalCanvas);
    }
  }

  initListeners();
})();
