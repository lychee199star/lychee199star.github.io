(() => {
  'use strict';

  const overlay = document.querySelector('#catcar-transition');
  const message = document.querySelector('#catcar-transition-message');
  if (!overlay || !message) return;

  const STORAGE_KEY = 'blog-catcar-transition-v1';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = prefersReducedMotion.matches;
  const TRANSITION_MS = reducedMotion ? 250 : 400;
  const MAX_WAIT_MS = 1200;
  let navigating = false;

  function readArrival() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw);
      sessionStorage.removeItem(STORAGE_KEY);
      return Boolean(state && Number.isFinite(state.at) && Date.now() - state.at < 8000);
    } catch {
      return false;
    }
  }

  function writeArrival() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
    } catch {
      /* 存储受限时不影响真实跳转，只会跳过新页入场遮罩。 */
    }
  }

  function renderMessage() {
    message.replaceChildren();
    [...'猫车运输中...'].forEach((character, index) => {
      const span = document.createElement('span');
      span.textContent = character;
      span.style.setProperty('--char-delay', `${index * 55}ms`);
      message.appendChild(span);
    });
  }

  function showOverlay() {
    renderMessage();
    overlay.classList.remove('is-leaving');
    overlay.classList.add('is-active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideOverlay() {
    overlay.classList.add('is-leaving');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => overlay.classList.remove('is-active', 'is-leaving'), reducedMotion ? 0 : 360);
  }

  function isModifiedClick(event) {
    return event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey;
  }

  function isInternalNavigation(anchor) {
    const rawHref = anchor.getAttribute('href')?.trim() || '';
    if (!rawHref || rawHref.startsWith('#') || anchor.hasAttribute('download')) return false;
    const target = (anchor.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return false;
    if (/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(rawHref)) return false;
    let destination;
    try {
      destination = new URL(anchor.href, window.location.href);
    } catch {
      return false;
    }
    if (destination.origin !== window.location.origin || destination.hash) return false;
    return destination.protocol === window.location.protocol;
  }

  function navigateWithCatcar(anchor) {
    if (navigating) return;
    navigating = true;
    try { window.savePlayerState?.(); } catch { /* 播放器异常时仍继续执行转场。 */ }
    writeArrival();
    showOverlay();
    const destination = anchor.href;
    let moved = false;
    const navigate = () => {
      if (moved) return;
      moved = true;
      window.location.href = destination;
    };
    window.setTimeout(navigate, TRANSITION_MS);
    window.setTimeout(navigate, MAX_WAIT_MS);
  }

  document.addEventListener('click', event => {
    if (navigating || event.defaultPrevented || isModifiedClick(event)) return;
    const target = event.target;
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (!anchor || !isInternalNavigation(anchor)) return;
    event.preventDefault();
    navigateWithCatcar(anchor);
  }, true);

  if (readArrival()) {
    showOverlay();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(hideOverlay);
    });
  }
})();
