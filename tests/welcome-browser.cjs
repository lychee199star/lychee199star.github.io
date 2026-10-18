// 独立浏览器验证每日弹窗设置；通过临时本地服务器模拟上线后的访问。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const key = 'blog-welcome-hidden-date-v1';
const errors = [];
let browser;
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  fs.readFile(file, (error, bytes) => error ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes));
});

async function createVisitor(timezoneId = 'Asia/Shanghai', storageState) {
  const context = await browser.newContext({ timezoneId, storageState, viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  return context;
}

async function openPage(context, url, date) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(date => {
    const OriginalDate = Date;
    const offset = new OriginalDate(date).getTime() - OriginalDate.now();
    window.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [OriginalDate.now() + offset])); }
      static now() { return OriginalDate.now() + offset; }
    };
  }, date);
  await page.goto(url);
  return page;
}

async function assertPopup(page, open) {
  assert.equal(await page.locator('#welcome-overlay').getAttribute('aria-hidden'), String(!open));
  assert.equal(await page.locator('#welcome-overlay').evaluate(el => el.inert), !open);
  assert.equal(await page.evaluate(() => document.body.classList.contains('no-scroll')), open);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const saturday = '2026-10-17T12:00:00+08:00';
  const visitor = await createVisitor();
  const page = await openPage(visitor, url, saturday);
  await assertPopup(page, true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'welcome-dismiss-today');
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '2026-10-17');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'welcome-close');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'welcome-dismiss-today');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'welcome-close');
  await page.locator('#welcome-dismiss-today').uncheck();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
  await page.locator('#welcome-close').click();
  await page.reload();
  await assertPopup(page, true);

  const tab = await openPage(visitor, url, saturday);
  await assertPopup(tab, true);
  await page.locator('#welcome-dismiss-today').check();
  await tab.waitForFunction(() => document.querySelector('#welcome-overlay').getAttribute('aria-hidden') === 'true');
  await page.keyboard.press('Escape');
  await page.reload();
  await assertPopup(page, false);
  await page.locator('#search-toggle').click();
  assert.equal(await page.locator('#search-overlay').getAttribute('aria-hidden'), 'false');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#search-overlay').getAttribute('aria-hidden'), 'true');
  const state = await visitor.storageState();
  const returningVisitor = await createVisitor('Asia/Shanghai', state);
  const returningPage = await openPage(returningVisitor, url, saturday);
  await assertPopup(returningPage, false);
  const independentVisitor = await createVisitor();
  const independentPage = await openPage(independentVisitor, url, saturday);
  await assertPopup(independentPage, true);
  const nextDay = await openPage(returningVisitor, url, '2026-10-18T00:00:00+08:00');
  await assertPopup(nextDay, true);
  assert.equal(await nextDay.locator('#welcome-dismiss-today').isChecked(), false);
  assert.equal(await nextDay.evaluate(key => localStorage.getItem(key), key), null);

  const midnightVisitor = await createVisitor();
  const midnightPage = await openPage(midnightVisitor, url, '2026-10-21T23:59:53+08:00');
  await midnightPage.locator('#welcome-dismiss-today').check();
  assert.equal(await midnightPage.evaluate(key => localStorage.getItem(key), key), '2026-10-21');
  await midnightPage.locator('#welcome-close').click();
  await midnightPage.waitForFunction(key => localStorage.getItem(key) === null, key, { timeout: 10000 });
  assert.equal(await midnightPage.locator('#welcome-dismiss-today').isChecked(), false);
  await assertPopup(midnightPage, false);
  const thursday = await openPage(midnightVisitor, url, '2026-10-22T00:00:01+08:00');
  await assertPopup(thursday, true);
  assert.equal(await thursday.locator('#welcome-thursday').isVisible(), true);
  await thursday.locator('#welcome-dismiss-today').check();
  await thursday.reload();
  await assertPopup(thursday, false);

  const westCoast = await createVisitor('America/Los_Angeles');
  const westPage = await openPage(westCoast, url, '2026-10-17T07:30:00Z');
  await westPage.locator('#welcome-dismiss-today').check();
  assert.equal(await westPage.evaluate(key => localStorage.getItem(key), key), '2026-10-17');
  await westPage.close();
  const nextWestDay = await openPage(westCoast, url, '2026-10-18T07:00:00Z');
  await assertPopup(nextWestDay, true);

  await independentPage.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'blog-welcome-hidden-date-v1') throw new DOMException('Full', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
  });
  await independentPage.locator('#welcome-dismiss-today').click();
  assert.equal(await independentPage.locator('#welcome-dismiss-today').isChecked(), false);
  assert.equal(await independentPage.locator('#welcome-preference-status').isVisible(), true);
  await independentPage.keyboard.press('Escape');
  await assertPopup(independentPage, false);

  const fileVisitor = await createVisitor();
  const filePage = await openPage(fileVisitor, pathToFileURL(path.join(root, 'index.html')).href, saturday);
  await filePage.locator('#welcome-dismiss-today').check();
  await filePage.reload();
  await assertPopup(filePage, false);

  fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
  const layouts = [];
  const visualVisitor = await createVisitor();
  for (const [name, date] of [['regular', saturday], ['thursday', '2026-10-22T12:00:00+08:00']]) {
    const visualPage = await openPage(visualVisitor, url, date);
    for (const [width, height] of [[1440, 960], [375, 812], [320, 568]]) {
      await visualPage.setViewportSize({ width, height });
      await visualPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await visualPage.locator('#welcome-dismiss-today').scrollIntoViewIfNeeded();
      const metrics = await visualPage.evaluate(() => {
        const dialog = document.querySelector('.welcome-dialog').getBoundingClientRect();
        const label = document.querySelector('.welcome-dismiss-today').getBoundingClientRect();
        return { left: label.left, right: label.right, bottom: label.bottom, dialogLeft: dialog.left, dialogBottom: dialog.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(!metrics.overflow, JSON.stringify(metrics));
      assert(metrics.left >= metrics.dialogLeft && metrics.left < metrics.viewportWidth / 2, JSON.stringify(metrics));
      assert(metrics.bottom <= metrics.dialogBottom && metrics.bottom <= height, JSON.stringify(metrics));
      layouts.push({ name, width, height, ...metrics });
      if (width !== 320) await visualPage.screenshot({ path: path.join(__dirname, 'artifacts', `welcome-preference-${name}-${width}.png`) });
    }
    await visualPage.evaluate(() => localStorage.setItem('blog-theme', 'dark'));
    await visualPage.reload();
    await visualPage.locator('#welcome-dismiss-today').scrollIntoViewIfNeeded();
    await visualPage.screenshot({ path: path.join(__dirname, 'artifacts', `welcome-preference-${name}-dark.png`) });
    await visualPage.evaluate(() => localStorage.removeItem('blog-theme'));
    await visualPage.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks: ['checkbox keyboard access', 'unchecking restores daily popup', 'HTTP reload and reopening', 'same-browser tabs', 'separate visitors', 'next local calendar day', 'active midnight reset without interrupting reading', 'Thursday preference', 'different timezone', 'storage failure feedback', 'file URL', 'desktop / mobile / dark layouts', 'search remains functional'], layouts }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.closeAllConnections();
  server.close();
});
