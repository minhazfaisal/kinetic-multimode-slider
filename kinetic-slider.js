/**
 * KINETIC.OS — Multi-Mode Interactive Slider Engine
 * Vanilla JavaScript (Zero Dependencies)
 * Features 4 Transition Modes: 3D Cube, Split Curtain, Depth Stack, Iris Warp
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // State & Configuration
  // =========================================================================
  const slides = Array.from(document.querySelectorAll('.slide-card'));
  const totalSlides = slides.length;
  let currentIndex = 0;
  let isTransitioning = false;

  // Modes: 'cube' | 'split' | 'stack' | 'iris'
  let currentMode = 'cube';
  // Axis: 'horizontal' | 'vertical'
  let currentAxis = 'horizontal';
  // Speeds: 0.4s | 0.8s | 1.5s
  const speeds = ['0.4s', '0.8s', '1.5s'];
  let speedIndex = 1; // default 0.8s

  const modeDescriptions = {
    cube: 'CUBE 3D: Volumetric spatial cube revolution on 3D axis',
    split: 'SPLIT CURTAIN: Dual counter-directional curtain slices',
    stack: 'DEPTH STACK: Cascading 3D physical card deck with depth perspective',
    iris: 'IRIS WARP: Expanding relativistic circular aperture warp'
  };

  // DOM Elements
  const body = document.body;
  const stagePerspective = document.getElementById('stagePerspective');
  const activeNum = document.getElementById('activeNum');
  const scrubberNodes = Array.from(document.querySelectorAll('.scrub-node'));
  const miniCards = Array.from(document.querySelectorAll('.mini-card'));
  const modePills = Array.from(document.querySelectorAll('.mode-pill'));
  const currentModeDescription = document.getElementById('currentModeDescription');
  const ambientNebula = document.getElementById('ambientNebula');

  // Trigger buttons
  const prevTrigger = document.getElementById('prevTrigger');
  const nextTrigger = document.getElementById('nextTrigger');
  const axisToggle = document.getElementById('axisToggle');
  const axisDisplay = document.getElementById('axisDisplay');
  const speedToggle = document.getElementById('speedToggle');
  const speedDisplay = document.getElementById('speedDisplay');
  const audioToggle = document.getElementById('audioToggle');
  const audioStatus = document.getElementById('audioStatus');

  // Dialog
  const hintBtn = document.getElementById('hintBtn');
  const keysDialog = document.getElementById('keysDialog');
  const dialogClose = document.getElementById('dialogClose');

  // Cursor Elements
  const cursor = document.getElementById('cursor');
  const cursorCoords = document.getElementById('cursorCoords');
  const cursorState = document.getElementById('cursorState');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let curX = mouseX, curY = mouseY;

  // Audio State
  let audioCtx = null;
  let sfxEnabled = false;

  // =========================================================================
  // Slide Switch Logic
  // =========================================================================
  function updateSlideClasses(direction = 'next') {
    slides.forEach((slide, idx) => {
      slide.classList.remove('active', 'prev', 'next', 'stack-1', 'stack-2', 'stack-3', 'swiped-out');

      if (currentMode === 'stack') {
        // Stack Mode class mapping (depth deck)
        const relIdx = (idx - currentIndex + totalSlides) % totalSlides;
        if (relIdx === 0) {
          slide.classList.add('active');
        } else if (relIdx === 1) {
          slide.classList.add('stack-1');
        } else if (relIdx === 2) {
          slide.classList.add('stack-2');
        } else if (relIdx === 3) {
          slide.classList.add('stack-3');
        }
      } else {
        // Cube / Split / Iris class mapping
        if (idx === currentIndex) {
          slide.classList.add('active');
        } else if (direction === 'next' && (idx === (currentIndex - 1 + totalSlides) % totalSlides)) {
          slide.classList.add('prev');
        } else if (direction === 'prev' && (idx === (currentIndex + 1) % totalSlides)) {
          slide.classList.add('next');
        }
      }
    });

    // Update Accent Theme Color
    const activeSlide = slides[currentIndex];
    const accent = activeSlide.dataset.accent || '#00ff88';
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(accent, 0.25));

    if (ambientNebula) {
      ambientNebula.style.background = `radial-gradient(circle, ${hexToRgba(accent, 0.35)} 0%, rgba(5,5,8,0) 70%)`;
    }

    // Update Counter & Controls
    const formatted = String(currentIndex + 1).padStart(2, '0');
    if (activeNum) activeNum.textContent = formatted;

    scrubberNodes.forEach((node, i) => {
      node.classList.toggle('active', i === currentIndex);
    });

    miniCards.forEach((mini, i) => {
      mini.classList.toggle('active', i === currentIndex);
    });

    // Play cyber slide SFX
    playSlideSound();
  }

  function goToSlide(targetIdx, direction = 'next') {
    if (isTransitioning || targetIdx === currentIndex) return;
    isTransitioning = true;

    // In Stack mode, animate the current card flying away first
    if (currentMode === 'stack') {
      const exitingSlide = slides[currentIndex];
      exitingSlide.classList.add('swiped-out');
    }

    currentIndex = (targetIdx + totalSlides) % totalSlides;
    updateSlideClasses(direction);

    // Timeout duration matching current speed
    const durationMs = parseFloat(speeds[speedIndex]) * 1000;
    setTimeout(() => {
      isTransitioning = false;
    }, durationMs);
  }

  function nextSlide() {
    goToSlide(currentIndex + 1, 'next');
  }

  function prevSlide() {
    goToSlide(currentIndex - 1, 'prev');
  }

  // =========================================================================
  // Mode & Engine Switcher
  // =========================================================================
  function setMode(mode) {
    if (!modeDescriptions[mode]) return;
    currentMode = mode;
    body.dataset.mode = mode;

    modePills.forEach(pill => {
      const isActive = pill.dataset.mode === mode;
      pill.classList.toggle('active', isActive);
      pill.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    if (currentModeDescription) {
      currentModeDescription.textContent = modeDescriptions[mode];
    }

    if (cursorState) {
      cursorState.textContent = mode.toUpperCase();
    }

    playModeSwitchSound();
    updateSlideClasses('next');
  }

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      setMode(pill.dataset.mode);
    });
  });

  // =========================================================================
  // Axis Toggle (Horizontal / Vertical)
  // =========================================================================
  function toggleAxis() {
    currentAxis = currentAxis === 'horizontal' ? 'vertical' : 'horizontal';
    body.dataset.axis = currentAxis;
    axisDisplay.textContent = currentAxis === 'horizontal' ? 'HORIZ' : 'VERT';
    playHapticBeep();
    updateSlideClasses('next');
  }

  axisToggle.addEventListener('click', toggleAxis);

  // =========================================================================
  // Speed Toggle
  // =========================================================================
  function cycleSpeed() {
    speedIndex = (speedIndex + 1) % speeds.length;
    const newSpeed = speeds[speedIndex];
    document.documentElement.style.setProperty('--transition-time', newSpeed);
    speedDisplay.textContent = newSpeed.toUpperCase();
    playHapticBeep();
  }

  speedToggle.addEventListener('click', cycleSpeed);

  // =========================================================================
  // Mouse Wheel / Trackpad Scroll Navigation
  // =========================================================================
  let lastWheelTime = 0;
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now - lastWheelTime < 450) return; // Debounce wheel events

    const delta = currentAxis === 'vertical' ? e.deltaY : (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);

    if (delta > 30) {
      nextSlide();
      lastWheelTime = now;
    } else if (delta < -30) {
      prevSlide();
      lastWheelTime = now;
    }
  }, { passive: true });

  // =========================================================================
  // Touch / Pointer Drag Gesture
  // =========================================================================
  let isDragging = false;
  let startX = 0, startY = 0;
  let deltaX = 0, deltaY = 0;

  stagePerspective.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, .keys-dialog')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
    deltaY = 0;
    if (cursorState) cursorState.textContent = 'DRAG';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    deltaX = e.clientX - startX;
    deltaY = e.clientY - startY;

    // Real-time subtle 3D rotational drag feedback
    if (currentMode === 'cube') {
      const activeCard = slides[currentIndex];
      if (currentAxis === 'horizontal') {
        const rotY = Math.max(Math.min(deltaX * 0.15, 25), -25);
        activeCard.style.transform = `translate3d(${deltaX * 0.2}px, 0, 0) rotateY(${rotY}deg)`;
      } else {
        const rotX = Math.max(Math.min(-deltaY * 0.15, 25), -25);
        activeCard.style.transform = `translate3d(0, ${deltaY * 0.2}px, 0) rotateX(${rotX}deg)`;
      }
    }
  });

  window.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;

    // Reset inline transforms
    slides[currentIndex].style.transform = '';

    const effectiveDelta = currentAxis === 'horizontal' ? deltaX : deltaY;
    const DRAG_THRESHOLD = 60;

    if (effectiveDelta < -DRAG_THRESHOLD) {
      nextSlide();
    } else if (effectiveDelta > DRAG_THRESHOLD) {
      prevSlide();
    }

    if (cursorState) cursorState.textContent = currentMode.toUpperCase();
  });

  // Navigation Trigger Buttons
  prevTrigger.addEventListener('click', prevSlide);
  nextTrigger.addEventListener('click', nextSlide);

  // Scrubber Node Click
  scrubberNodes.forEach(node => {
    node.addEventListener('click', () => {
      const idx = parseInt(node.dataset.goto, 10);
      goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
    });
  });

  // Mini Card Click
  miniCards.forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.goto, 10);
      goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
    });
  });

  // =========================================================================
  // Holographic Cyber Cursor
  // =========================================================================
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (cursorCoords) {
      cursorCoords.textContent = `X:${String(Math.round(mouseX)).padStart(4, '0')} Y:${String(Math.round(mouseY)).padStart(4, '0')}`;
    }
  });

  function renderCursor() {
    curX += (mouseX - curX) * 0.22;
    curY += (mouseY - curY) * 0.22;
    if (cursor) {
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
    }
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // =========================================================================
  // Synthesized Cyber Web Audio SFX
  // =========================================================================
  function initAudio() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function toggleAudio() {
    initAudio();
    sfxEnabled = !sfxEnabled;
    audioStatus.textContent = sfxEnabled ? 'SFX ON' : 'SFX OFF';
    audioToggle.style.borderColor = sfxEnabled ? 'var(--accent-color)' : '';
    if (sfxEnabled) playHapticBeep(880, 0.08);
  }

  audioToggle.addEventListener('click', toggleAudio);

  function playSlideSound() {
    if (!audioCtx || !sfxEnabled) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      // Futuristic frequency drop whoosh
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }

  function playModeSwitchSound() {
    if (!audioCtx || !sfxEnabled) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  function playHapticBeep(freq = 600, duration = 0.04) {
    if (!audioCtx || !sfxEnabled) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  // =========================================================================
  // Keyboard Shortcuts
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (keysDialog.open && e.key !== 'Escape') return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      prevSlide();
    } else if (e.key === '1') {
      setMode('cube');
    } else if (e.key === '2') {
      setMode('split');
    } else if (e.key === '3') {
      setMode('stack');
    } else if (e.key === '4') {
      setMode('iris');
    } else if (e.key.toLowerCase() === 'a') {
      toggleAxis();
    } else if (e.key.toLowerCase() === 's') {
      cycleSpeed();
    } else if (e.key.toLowerCase() === 'm') {
      toggleAudio();
    } else if (e.key === '?') {
      openKeysDialog();
    }
  });

  // Modal Dialog
  function openKeysDialog() {
    keysDialog.showModal();
  }
  function closeKeysDialog() {
    keysDialog.close();
  }

  hintBtn.addEventListener('click', openKeysDialog);
  dialogClose.addEventListener('click', closeKeysDialog);
  keysDialog.addEventListener('click', (e) => {
    if (e.target === keysDialog) closeKeysDialog();
  });

  // Helper
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Initialize
  updateSlideClasses();
});
