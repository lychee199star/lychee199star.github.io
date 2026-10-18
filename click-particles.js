(() => {
  'use strict';

  const canvas = document.querySelector('#click-particles');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const COLORS = ['#3E8EF7', '#6FD6FF', '#BFF0FF', '#FFFFFF'];
  const MAX_PARTICLES = 300;
  const GRAVITY = 140; // CSS 像素 / 秒²。
  const TAU = Math.PI * 2;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const particles = [];
  // 归一化的掌垫与四个趾垫，避免 emoji 的尺寸、颜色随系统变化。
  const pawPads = [
    [0, 0.18, 0.25, 0.22],
    [-0.32, -0.10, 0.10, 0.13],
    [-0.13, -0.32, 0.10, 0.13],
    [0.13, -0.32, 0.10, 0.13],
    [0.32, -0.10, 0.10, 0.13],
  ];
  let frameId = null;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let selectedAtPointerDown = false;

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // 后续绘制与 clientX/clientY 都使用 CSS 像素。
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function hasSelectedText() {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().length > 0) return true;
    const active = document.activeElement;
    return (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
      && active.selectionStart !== null
      && active.selectionStart !== active.selectionEnd;
  }

  function clearParticles() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    particles.length = 0;
    ctx.clearRect(0, 0, width, height);
  }

  function drawParticle(particle, age) {
    const remaining = 1 - age / particle.lifetime;
    // 前半程保持更大的尺寸与更高的不透明度，让散开的粒子更醒目。
    const visibility = Math.sqrt(remaining);
    const size = particle.size * visibility;
    ctx.save();
    ctx.translate(
      particle.x + particle.vx * age,
      particle.y + particle.vy * age + 0.5 * GRAVITY * age * age,
    );
    ctx.rotate(particle.rotation + particle.spin * age);
    ctx.globalAlpha = visibility;
    ctx.fillStyle = particle.color;

    if (particle.shape === 'square') {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    } else {
      ctx.beginPath();
      if (particle.shape === 'paw') {
        ctx.scale(size, size);
        for (const [x, y, rx, ry] of pawPads) {
          ctx.moveTo(x + rx, y);
          ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
        }
      } else {
        ctx.arc(0, 0, size / 2, 0, TAU);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  function animateParticles(now) {
    frameId = null;
    ctx.clearRect(0, 0, width, height);
    let alive = 0;
    for (const particle of particles) {
      const age = Math.max(0, (now - particle.born) / 1000);
      if (age >= particle.lifetime) continue;
      particles[alive++] = particle;
      drawParticle(particle, age);
    }
    // 原地清理过期粒子，避免每帧创建新数组。
    particles.length = alive;
    if (alive > 0) frameId = requestAnimationFrame(animateParticles);
  }

  function burst(event) {
    const selectionWasActive = selectedAtPointerDown;
    selectedAtPointerDown = false;
    // 键盘激活和 label 转发的合成 click 没有实际点击位置，不重复生成。
    if (event.detail === 0 || reducedMotion.matches || document.hidden
      || selectionWasActive || hasSelectedText()) return;

    const count = 10 + Math.floor(Math.random() * 5);
    // 剩余额度不足一整簇时跳过，既保持每簇 10–14 个，也绝不突破 300 个。
    if (particles.length + count > MAX_PARTICLES) return;
    if (pixelRatio !== (window.devicePixelRatio || 1)) resizeCanvas();
    const born = performance.now();
    for (let i = 0; i < count; i++) {
      const direction = Math.random() * TAU;
      const speed = 120 + Math.random() * 120;
      const shape = Math.random() < 0.1 ? 'paw' : (Math.random() < 0.5 ? 'circle' : 'square');
      particles.push({
        x: event.clientX,
        y: event.clientY,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        size: shape === 'paw' ? 9 + Math.random() * 2 : 4 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape,
        rotation: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 6,
        lifetime: 0.6 + Math.random() * 0.3,
        born,
      });
    }
    if (frameId === null) frameId = requestAnimationFrame(animateParticles);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  // 提前记住划词状态，避免点击取消选区的那一下误触发。
  document.addEventListener('pointerdown', () => {
    selectedAtPointerDown = hasSelectedText();
  }, { capture: true, passive: true });
  // 触屏轻点也会生成 click，无需再监听 touchstart / touchend。
  document.addEventListener('click', burst, { capture: true, passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) clearParticles();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearParticles();
  });
  window.addEventListener('pagehide', clearParticles);
})();
