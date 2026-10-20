(() => {
  'use strict';

  const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tiltElements = [...document.querySelectorAll('.tilt')];
  if (!tiltElements.length) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function resetTilt(element) {
    element.classList.remove('is-tilting');
    element.style.setProperty('--rx', '0deg');
    element.style.setProperty('--ry', '0deg');
  }

  function bindTilt(element) {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let hasPointer = false;

    const flush = () => {
      frame = 0;
      if (!hasPointer || !hoverMedia.matches || reducedMotion.matches) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const offsetX = (pointerX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const offsetY = (pointerY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const responsiveX = Math.sign(offsetX) * Math.pow(Math.abs(offsetX), 0.68);
      const responsiveY = Math.sign(offsetY) * Math.pow(Math.abs(offsetY), 0.68);
      element.style.setProperty('--rx', `${clamp(-responsiveY * 5, -5, 5).toFixed(2)}deg`);
      element.style.setProperty('--ry', `${clamp(responsiveX * 5, -5, 5).toFixed(2)}deg`);
    };

    element.addEventListener('mouseenter', () => {
      if (!hoverMedia.matches || reducedMotion.matches) return;
      element.classList.add('is-tilting');
    });

    element.addEventListener('mousemove', event => {
      if (!hoverMedia.matches || reducedMotion.matches) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hasPointer = true;
      if (!frame) frame = requestAnimationFrame(flush);
    });

    element.addEventListener('mouseleave', () => {
      hasPointer = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetTilt(element);
    });

    element.addEventListener('blur', () => {
      hasPointer = false;
      resetTilt(element);
    }, true);
  }

  tiltElements.forEach(bindTilt);

  const syncMotionPreference = () => {
    if (!hoverMedia.matches || reducedMotion.matches) tiltElements.forEach(resetTilt);
  };
  hoverMedia.addEventListener?.('change', syncMotionPreference);
  reducedMotion.addEventListener?.('change', syncMotionPreference);
})();
