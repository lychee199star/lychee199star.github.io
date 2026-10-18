// 真实浏览器验证；测量代码只注入测试页面，不进入博客运行代码。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const errors = [];
let browser;
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>body{min-height:2500px;background:#18344e;color:white}main{padding:40px}button,input,textarea{display:block;margin:12px 0}#click-target{height:300px}</style></head><body><main><p id="selectable">选中这段文字，复制时不应该产生粒子。</p><input id="input" value="选择输入框里的文字"><textarea id="textarea">选择留言框里的文字</textarea><button id="test-button" onclick="this.dataset.clicked='yes'">测试按钮</button><a id="test-link" href="#bottom">测试链接</a><div id="click-target"></div><div id="bottom" style="margin-top:1200px">页面底部</div></main><canvas id="click-particles" aria-hidden="true"></canvas><script src="/click-particles.js"></script></body></html>`;
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  if (relative === 'particles-fixture.html') return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fixture);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  fs.readFile(file, (error, bytes) => error ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes));
});

async function createPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'no-preference', ...options });
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const stats = window.particleTest = { requested: 0, executed: 0, pending: new Set(), frames: [], clicks: [], now: 0 };
    document.addEventListener('click', event => {
      stats.clicks.push({ now: performance.now(), x: event.clientX, y: event.clientY });
    }, { capture: true, passive: true });
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      stats.requested++;
      const id = request(now => { stats.pending.delete(id); stats.executed++; stats.now = now; callback(now); });
      stats.pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => { stats.pending.delete(id); cancel(id); };
    for (const name of ['clearRect', 'save', 'translate', 'scale', 'arc', 'ellipse', 'fillRect', 'fill']) {
      const original = CanvasRenderingContext2D.prototype[name];
      CanvasRenderingContext2D.prototype[name] = function(...args) {
        if (this.canvas.id === 'click-particles') {
          if (name === 'clearRect') stats.frames.push({ now: stats.now, draws: [] });
          const frame = stats.frames.at(-1);
          if (name === 'save') frame?.draws.push({});
          const draw = frame?.draws.at(-1);
          if (draw) {
            if (name === 'translate') [draw.x, draw.y] = args;
            if (name === 'scale') draw.size = args[0];
            if (name === 'arc') { draw.shape = 'circle'; draw.size = args[2] * 2; }
            if (name === 'ellipse') draw.shape = 'paw';
            if (name === 'fillRect') { draw.shape = 'square'; draw.size = args[2]; }
            if (name === 'fillRect' || name === 'fill') { draw.alpha = this.globalAlpha; draw.color = this.fillStyle; }
          }
        }
        return original.apply(this, args);
      };
    }
  });
  return page;
}

async function idle(page) {
  await page.waitForFunction(() => particleTest.pending.size === 0, null, { polling: 25 });
}
async function resetMetrics(page) {
  await idle(page);
  await page.evaluate(() => { particleTest.frames = []; particleTest.requested = 0; particleTest.executed = 0; });
}
async function noBurst(page, action) {
  await resetMetrics(page);
  await action();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => particleTest.requested), 0);
}
async function oneBurst(page, x, y, touch = false) {
  await resetMetrics(page);
  await (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  await page.waitForFunction(() => particleTest.frames.some(frame => frame.draws.length), null, { polling: 25 });
  const first = await page.evaluate(() => particleTest.frames.find(frame => frame.draws.length));
  assert(first.draws.length >= 10 && first.draws.length <= 14, JSON.stringify(first));
  const click = await page.evaluate(() => particleTest.clicks.at(-1));
  const elapsed = Math.max(0, (first.now - click.now) / 1000);
  const maxTravel = 240 * elapsed + 70 * elapsed * elapsed + 2;
  assert(first.draws.every(draw => Math.hypot(draw.x - x, draw.y - y) <= maxTravel), `粒子起点应对准点击坐标：${JSON.stringify({ x, y, elapsed, first })}`);
  return first;
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await createPage();
  await page.goto(origin + '/particles-fixture.html');
  assert.equal(await page.locator('#click-particles').count(), 1);
  assert.deepEqual(await page.locator('#click-particles').evaluate(canvas => {
    const style = getComputedStyle(canvas);
    return { position: style.position, pointerEvents: style.pointerEvents, zIndex: style.zIndex, width: canvas.width, height: canvas.height };
  }), { position: 'fixed', pointerEvents: 'none', zIndex: '9999', width: 2000, height: 1600 });
  assert.equal(await page.evaluate(() => particleTest.requested), 0, '空闲时不应启动动画');
  await oneBurst(page, 500, 400);
  await idle(page);
  const frames = await page.evaluate(() => particleTest.frames);
  const click = await page.evaluate(() => particleTest.clicks.at(-1));
  const visible = frames.filter(frame => frame.draws.length);
  assert(visible.length >= 3);
  // rAF 的首个时间戳可能早于同一帧内的点击；从出生后的稳定帧测量轨迹。
  const first = visible.find(frame => frame.now >= click.now + 30);
  assert(first);
  const middle = visible.find(frame => frame.now >= first.now + 100);
  const later = visible.find(frame => frame.now >= first.now + 200);
  assert(middle && later, '应持续绘制可见粒子');
  const dt1 = (middle.now - first.now) / 1000;
  const dt2 = (later.now - middle.now) / 1000;
  const gravity = 2 * ((later.draws[0].y - middle.draws[0].y) / dt2 - (middle.draws[0].y - first.draws[0].y) / dt1) / (dt1 + dt2);
  assert(Math.abs(gravity - 140) < 0.1, `实际重力 ${gravity}`);
  const age0 = (first.now - click.now) / 1000;
  const age1 = (middle.now - click.now) / 1000;
  const vx = (middle.draws[0].x - first.draws[0].x) / dt1;
  const vy = (middle.draws[0].y - first.draws[0].y) / dt1 - 0.5 * gravity * (age0 + age1);
  assert(Math.abs(first.draws[0].x - vx * age0 - click.x) < 1);
  assert(Math.abs(first.draws[0].y - vy * age0 - 0.5 * gravity * age0 * age0 - click.y) < 1);
  assert(later.draws[0].alpha < first.draws[0].alpha && later.draws[0].size < first.draws[0].size);
  assert(frames.at(-1).now - click.now >= 600 && frames.at(-1).now - click.now < 1100);
  const executed = await page.evaluate(() => particleTest.executed);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => particleTest.executed), executed, '粒子清空后应停止循环');
  assert.equal(await page.evaluate(() => {
    const canvas = document.querySelector('#click-particles');
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value !== 0);
  }), false, '粒子结束后画布应透明');

  await noBurst(page, async () => {
    await page.evaluate(() => window.getSelection().selectAllChildren(document.querySelector('#selectable')));
    await page.mouse.click(500, 400);
  });
  for (const selector of ['#input', '#textarea']) {
    await noBurst(page, async () => {
      await page.locator(selector).evaluate(input => { input.focus(); input.setSelectionRange(0, 4); });
      await page.mouse.click(500, 400);
    });
  }
  await page.locator('#test-button').click();
  assert.equal(await page.locator('#test-button').getAttribute('data-clicked'), 'yes');
  await page.locator('#test-link').click();
  assert.equal(new URL(page.url()).hash, '#bottom');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await resetMetrics(page);
  const burstMilliseconds = await page.evaluate(() => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) document.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 500, clientY: 400 }));
    return performance.now() - start;
  });
  await page.waitForFunction(() => particleTest.frames.some(frame => frame.draws.length), null, { polling: 25 });
  const rapidCount = await page.evaluate(() => particleTest.frames.find(frame => frame.draws.length).draws.length);
  assert(rapidCount >= 200 && rapidCount <= 280, `20 次点击生成 ${rapidCount} 个粒子`);
  assert(burstMilliseconds < 1000, `20 次连点处理耗时 ${burstMilliseconds} ms`);
  await resetMetrics(page);
  await page.evaluate(() => {
    for (let i = 0; i < 60; i++) document.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 500, clientY: 400 }));
  });
  await page.waitForFunction(() => particleTest.frames.some(frame => frame.draws.length), null, { polling: 25 });
  const capped = await page.evaluate(() => particleTest.frames.find(frame => frame.draws.length).draws);
  assert(capped.length >= 286 && capped.length <= 300);
  const colors = new Set(['#3e8ef7', '#6fd6ff', '#bff0ff', '#ffffff']);
  assert(capped.every(draw => colors.has(draw.color)));
  assert.deepEqual([...new Set(capped.map(draw => draw.shape))].sort(), ['circle', 'paw', 'square']);
  assert(capped.every(draw => draw.size > 0 && draw.size <= (draw.shape === 'paw' ? 11 : 8)));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await idle(page);
  await noBurst(page, () => page.mouse.click(500, 400));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await oneBurst(page, 500, 400);
  await idle(page);

  await page.setViewportSize({ width: 700, height: 600 });
  await page.waitForFunction(() => document.querySelector('#click-particles').width === innerWidth * devicePixelRatio, null, { polling: 25 });
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
  await oneBurst(page, 350, 280);
  await idle(page);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await idle(page);

  const mobile = await createPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await mobile.goto(origin + '/particles-fixture.html');
  await oneBurst(mobile, 180, 400, true);
  assert.equal(await mobile.locator('#click-particles').evaluate(canvas => canvas.width), 1125);
  await idle(mobile);
  const reduced = await createPage({ reducedMotion: 'reduce' });
  await reduced.goto(origin + '/particles-fixture.html');
  await noBurst(reduced, () => reduced.mouse.click(500, 400));

  // 实际博客集成：弹窗、链接、文章展开和友链页继续正常工作。
  const blog = await createPage({ deviceScaleFactor: 1 });
  await blog.goto(origin + '/index.html');
  await blog.locator('#welcome-close').click();
  assert.equal(await blog.locator('#welcome-overlay').getAttribute('aria-hidden'), 'true');
  await blog.locator('#theme-toggle').click();
  assert.equal(await blog.locator('body').evaluate(body => body.classList.contains('dark')), true);
  await blog.locator('#learning-post-copy .expand-toggle').click();
  assert.equal(await blog.locator('#learning-post-copy .post-extra').isVisible(), true);
  await blog.locator('#learning-post-copy .expand-toggle').click();
  assert.equal(await blog.locator('#learning-post-copy .post-extra').isVisible(), false);
  await blog.locator('.nav-links a[href="friends.html"]').click();
  await blog.waitForURL('**/friends.html');
  assert.equal(await blog.locator('#click-particles').count(), 1);
  await blog.locator('.friends-brand').hover();
  assert.equal(await blog.locator('.friends-brand').evaluate(link => link.matches(':hover')), true);
  await blog.mouse.wheel(0, 300);
  await blog.waitForFunction(() => scrollY > 0, null, { polling: 25 });
  await blog.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await blog.mouse.click(500, 200);
  fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
  await blog.screenshot({ path: path.join(__dirname, 'artifacts', 'click-particles-preview.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', rapidClicks: { count: 20, particles: rapidCount, handlerMilliseconds: burstMilliseconds }, capAfter60Clicks: capped.length, measuredGravity: gravity, checks: ['10–14 particles per click', 'four blue-white colors', 'circle / square / paw', 'gravity, shrink and fade', 'idle animation stops', 'text and input selection', 'links / buttons / hover / scroll', 'touch without duplicate bursts', '20 rapid clicks', 'strict 300 cap', 'DPR 2 and 3', 'resize and scroll coordinates', 'reduced motion on load and live change', 'homepage and friends integration', 'no page errors'] }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.closeAllConnections();
  server.close();
});
