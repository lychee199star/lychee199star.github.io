# 蓝白点击粒子：完整代码与接入说明

已经接入博客首页 `D:/codex工作区/index.html` 和友链页 `D:/codex工作区/friends.html`，无需重复粘贴。刷新页面即可使用。生产代码仅依赖浏览器原生 API，不需要安装任何库。

## 1. JavaScript 放在哪里

完整代码保存在 `D:/codex工作区/click-particles.js`。它是与 `script.js` 同目录的独立脚本，不要再把它复制进 `script.js`，否则会重复监听、重复生成粒子。

```javascript
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
```

## 2. Canvas 插入哪个 HTML 节点

在 `index.html` 的 `body` 直接子级、靠近 `</body>` 的位置，现有 `<script src="script.js"></script>` 前加入下面两行。不要放进文章卡片、带 transform 的容器或弹窗内部。已完成此修改。

```html
<canvas id="click-particles" aria-hidden="true"></canvas>
<script src="click-particles.js"></script>
<script src="script.js"></script>
<script src="guestbook.js"></script>
```

友链页也已在 `friends.js` 引用前加入相同的 Canvas 和 `click-particles.js`。每个页面只放一个 Canvas、加载一次粒子脚本。

## 3. CSS 要不要改

需要一小段覆盖层样式，已经加入 `D:/codex工作区/styles.css`，位于 `body.no-scroll` 规则后面。完整新增样式如下：

```css
/* 全屏点击粒子：只负责绘制，鼠标、触摸与滚动都穿透到页面。 */
#click-particles {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  z-index: 9999;
}
@media (prefers-reduced-motion: reduce) {
  #click-particles { display: none; }
}
```

## 4. 已实现的行为

- document 级捕获阶段监听 click，触屏轻点同样触发；没有同时监听 touchend，因此不会一次触摸爆两簇。监听器不取消默认行为，也不阻断事件传播。
- 每簇随机 10–14 个；普通粒子为 4–8px 的小圆点和小方块，约 10% 替换为 9–11px 的画布猫爪。
- 只从 `#3E8EF7`、`#6FD6FF`、`#BFF0FF`、`#FFFFFF` 中随机取色。
- 粒子以 120–240px/秒的初速度沿随机方向散开，扩散范围比初版更大；按真实经过时间计算轻微重力，0.6–0.9 秒内缩小、淡出并清除。尺寸与透明度采用更缓的衰减，前半程更醒目。
- 同屏严格不超过 300 个；剩余空间放不下一整簇时跳过本次生成，避免产生不足 10 个的半簇。
- 没有粒子时停止 requestAnimationFrame；切换到后台或离开页面时清空并停止。
- 根据 devicePixelRatio 放大画布，绘图与点击坐标仍使用 CSS 像素；窗口尺寸变化时重新设置画布，点击时也校验像素比变化。
- 正文、输入框或留言框中有选中文字时不生成；点击取消选区的那一下也不生成。
- 系统减少动态效果开启时不生成；运行中打开该设置，会立即清空已有粒子并停止绘制。

## 5. 验证清单

- [ ] 点击空白处：出现一小簇蓝白粒子，向四周散开，轻微下坠并在约一秒内消失；多点击几次可见迷你猫爪。
- [ ] 点击链接、主题切换、欢迎弹窗按钮和文章展开／收起：原有功能照常工作；链接悬停、鼠标滚轮也不受影响。
- [ ] 在手机浏览器轻点页面：一次触摸只生成一簇；滑动页面仍可正常滚动。
- [ ] 快速连点 20 下：动画正常，控制台无报错；更密集点击时数量保持在 300 个以内。
- [ ] 调整窗口大小，再滚动页面或改变浏览器缩放后点击：粒子起点仍对准点击位置，高分屏显示清晰。
- [ ] 划选正文、输入框或留言框里的文字，再复制或点击取消选择：不生成粒子。
- [ ] 开启系统“减少动态效果”：不生成粒子；关闭该设置后恢复。
- [ ] 停止点击约一秒：粒子消失，画布变透明，粒子动画循环停止。

自动浏览器验证脚本为 `D:/codex工作区/tests/click-particles-browser.cjs`。它使用测试环境的浏览器自动化库，博客实际运行不加载该库。触摸验证采用浏览器移动端模拟，以上清单也可用于实际手机验收。
