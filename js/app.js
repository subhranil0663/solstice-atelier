/**
 * SOLSTICE ATELIER | Application Controller
 * Handles header scroll separation, architectural schematic layer toggles,
 * studio booking drawer interactions, and accessibility.
 */

(function () {
  'use strict';

  // Header scroll detection
  const header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', function () {
      const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', !isExpanded);
      mainNav.classList.toggle('mobile-active');
    });

    // Close when clicking nav links
    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('mobile-active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Architectural Schematic Segmented Toggles (Section 1)
  const schematicBlocks = document.querySelectorAll('.installation-block');
  schematicBlocks.forEach(function (block) {
    const segments = block.querySelectorAll('.segment-opt');
    const svg = block.querySelector('.schematic-svg');
    if (!svg) return;

    segments.forEach(function (segment) {
      segment.addEventListener('click', function () {
        segments.forEach(s => s.classList.remove('active'));
        segment.classList.add('active');

        const mode = segment.getAttribute('data-mode'); // 'rays' or 'absorption'
        const rayGroup = svg.querySelector('.layer-rays');
        const absGroup = svg.querySelector('.layer-absorption');

        if (mode === 'rays') {
          if (rayGroup) rayGroup.style.opacity = '1';
          if (absGroup) absGroup.style.opacity = '0.15';
        } else {
          if (rayGroup) rayGroup.style.opacity = '0.15';
          if (absGroup) absGroup.style.opacity = '1';
        }
      });
    });
  });

  // Interactive Booking Drawer
  const drawerBackdrop = document.getElementById('bookingDrawer');
  const drawerPanel = drawerBackdrop ? drawerBackdrop.querySelector('.drawer-panel') : null;
  const openButtons = document.querySelectorAll('.open-booking-drawer');
  const closeButton = drawerBackdrop ? drawerBackdrop.querySelector('.drawer-close-btn') : null;
  const bookingForm = document.getElementById('bookingForm');
  const bookingConfirmation = document.getElementById('bookingConfirmation');

  let lastActiveElement = null;

  function openDrawer() {
    if (!drawerBackdrop) return;
    lastActiveElement = document.activeElement;
    drawerBackdrop.classList.add('open');
    drawerBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first input
    const firstInput = drawerBackdrop.querySelector('input, select, button');
    if (firstInput) {
      setTimeout(function () { firstInput.focus(); }, 180);
    }
  }

  function closeDrawer() {
    if (!drawerBackdrop) return;
    drawerBackdrop.classList.remove('open');
    drawerBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (lastActiveElement) {
      lastActiveElement.focus();
    }
  }

  openButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openDrawer();
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', function (e) {
      if (e.target === drawerBackdrop) {
        closeDrawer();
      }
    });

    // Escape key listener
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerBackdrop.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  // Handle Booking Form Submit
  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('guestName').value;
      const chamber = document.getElementById('preferredChamber').value;
      const confName = document.getElementById('confGuestName');
      const confChamber = document.getElementById('confChamberName');
      const confCode = document.getElementById('confCode');

      if (confName) confName.textContent = name;
      if (confChamber) confChamber.textContent = chamber;
      if (confCode) confCode.textContent = 'KYT-' + Math.floor(1000 + Math.random() * 9000);

      bookingForm.style.display = 'none';
      if (bookingConfirmation) {
        bookingConfirmation.classList.add('visible');
      }
    });
  }
})();
