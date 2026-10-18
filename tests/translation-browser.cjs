// 使用固定版本的真实 translate.js；自动化用模拟响应验证边界，--live 额外验证真实 CDN 和在线机翻。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const CDN = 'https://cdn.staticfile.net/translate.js/3.18.66/translate.js';
const libraryPath = process.env.TRANSLATE_LIBRARY_PATH || path.join(os.tmpdir(), 'codex-translate-3.18.66.js');
const library = fs.readFileSync(libraryPath, 'utf8');
const buttonHTML = '<button class="translation-toggle notranslate" type="button" data-language-toggle translate="no" title="机翻仅供参喵" aria-pressed="false">译/EN</button>';
const imports = `<script id="translate-cdn" async src="${CDN}" onerror="this.dataset.failed='true'"></script><script src="translation.js"></script>`;
const article = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文章测试</title><link rel="stylesheet" href="styles.css"></head><body><nav class="top-nav"><div class="nav-links"><a href="friends.html">友链</a>${buttonHTML}</div></nav><main><h1>这是一篇新的文章</h1><p>不同页面也应该记住我选择的语言。</p><pre><code>const message = "代码保持中文";</code></pre></main>${imports}</body></html>`;
let browser;
const errors = [];
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  if (relative === 'translation-article.html') return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(article);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  fs.readFile(file, (error, bytes) => error ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes));
});
const translations = new Map([
  ['首页', 'Home'], ['文章', 'Articles'], ['关于我', 'About me'], ['友链', 'Friends'],
  ['做一个让自己愿意反复打开的学习系统', 'A learning system worth returning to'],
  ['同行猎人名录', 'Fellow Hunters'], ['这是一篇新的文章', 'This is a new article'],
  ['展开', 'Expand'], ['收起', 'Collapse'],
]);

async function createPage({ mobile = false, cdnFails = false, service = { fails: false }, live = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  const payloads = [];
  if (!live) {
    await context.route(CDN, route => cdnFails ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: library }));
    await context.route('https://edge.microsoft.com/translate/auth', async route => {
      if (service.fails) return route.abort();
      await route.fulfill({ contentType: 'text/plain', body: 'test-only-token', headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await context.route('https://api.cognitive.microsofttranslator.com/translate?**', async route => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST' } });
      const values = route.request().postDataJSON();
      payloads.push(...values.map(item => item.Text));
      await new Promise(resolve => setTimeout(resolve, 250));
      const result = values.map(item => ({ translations: [{ to: 'en', text: translations.get(item.Text.trim()) || item.Text.replace(/[\u3400-\u9fff]+/g, 'English text') }] }));
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result), headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push({ url: page.url(), error: error.message }));
  await page.addInitScript(() => {
    try {
      const date = new Date();
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      localStorage.setItem('blog-welcome-hidden-date-v1', day);
    } catch {}
  });
  return { page, context, payloads };
}

async function ready(page, language) {
  await page.waitForFunction(language => document.documentElement.lang === language && document.documentElement.dataset.translationState === 'ready', language);
  assert.equal(await page.locator('[data-language-toggle]').textContent(), language === 'en' ? '中' : '译/EN');
  assert.equal(await page.locator('#translation-status').isVisible(), false);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { page, payloads } = await createPage();
  await page.goto(origin + '/index.html');
  await ready(page, 'zh-CN');
  assert(await page.locator('[data-language-toggle]').evaluate(button => button.previousElementSibling.getAttribute('href') === 'friends.html'));
  assert.equal(await page.locator('[data-language-toggle]').getAttribute('title'), '机翻仅供参喵');
  const originalTitle = await page.locator('#article h3').textContent();
  const originalParagraph = await page.locator('#learning-post-copy > p').textContent();
  await page.evaluate(() => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.id = 'translation-code-probe';
    code.textContent = 'const message = "代码保持中文";';
    pre.append(code);
    document.querySelector('main').append(pre);
  });
  const navStyles = await page.evaluate(() => {
    const a = getComputedStyle(document.querySelector('.nav-links > a[href="friends.html"]'));
    const b = getComputedStyle(document.querySelector('[data-language-toggle]'));
    return { a: [a.fontSize, a.fontFamily, a.lineHeight, a.color, a.padding], b: [b.fontSize, b.fontFamily, b.lineHeight, b.color, b.padding] };
  });
  assert.deepEqual(navStyles.a, navStyles.b);
  await page.locator('[data-language-toggle]').click();
  assert.equal(await page.locator('#translation-status').textContent(), '本喵正在翻译喵，稍等一下下！');
  await ready(page, 'en');
  assert.equal((await page.locator('#article h3').textContent()).trim(), 'A learning system worth returning to');
  assert.equal(await page.locator('#translation-code-probe').textContent(), 'const message = "代码保持中文";');
  assert(!payloads.some(text => text.includes('代码保持中文') || text.includes('机翻仅供参喵') || text.includes('本喵正在翻译')));
  assert.equal(await page.evaluate(() => localStorage.getItem('blog-language')), 'en');
  await page.locator('#learning-post-copy .expand-toggle').click();
  await page.waitForFunction(() => document.querySelector('#learning-post-copy .expand-toggle').textContent.includes('Collapse'));
  await page.locator('#learning-post-copy .expand-toggle').click();
  await page.waitForFunction(() => document.querySelector('#learning-post-copy .expand-toggle').textContent.includes('Expand'));
  await page.locator('[data-language-toggle]').click();
  await ready(page, 'zh-CN');
  assert.equal(await page.locator('#article h3').textContent(), originalTitle);
  assert.equal(await page.locator('#learning-post-copy > p').textContent(), originalParagraph);
  await page.locator('[data-language-toggle]').click();
  await ready(page, 'en'); // 已有翻译缓存时也必须结束提示。
  await page.reload();
  await ready(page, 'en');
  await page.locator('.nav-links a[href="friends.html"]').click();
  await page.waitForURL('**/friends.html');
  await ready(page, 'en');
  assert.equal((await page.locator('h1').textContent()).trim(), 'Fellow Hunters');
  await page.goto(origin + '/translation-article.html');
  await ready(page, 'en');
  assert.equal((await page.locator('h1').textContent()).trim(), 'This is a new article');
  assert.equal(await page.locator('code').textContent(), 'const message = "代码保持中文";');
  await page.locator('[data-language-toggle]').click();
  await ready(page, 'zh-CN');
  assert.equal(await page.locator('h1').textContent(), '这是一篇新的文章');

  const { page: mobile } = await createPage({ mobile: true });
  await mobile.goto(origin + '/index.html');
  await mobile.locator('#menu-toggle').tap();
  assert(await mobile.locator('[data-language-toggle]').isVisible());
  await mobile.locator('[data-language-toggle]').tap();
  await ready(mobile, 'en');
  await mobile.locator('#menu-toggle').tap();
  await mobile.locator('[data-language-toggle]').tap();
  await ready(mobile, 'zh-CN');
  await mobile.locator('#menu-toggle').tap();
  fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
  await mobile.screenshot({ path: path.join(__dirname, 'artifacts', 'translation-menu-375.png') });

  const { page: offline } = await createPage({ cdnFails: true });
  await offline.goto(origin + '/index.html');
  await offline.locator('[data-language-toggle]').click();
  await offline.waitForFunction(() => document.querySelector('#translation-status').textContent === '翻译组件离家出走了喵');
  assert.equal(await offline.locator('#article h3').textContent(), originalTitle);
  assert.equal(await offline.locator('[data-language-toggle]').isEnabled(), true);
  await offline.locator('#theme-toggle').click();
  assert(await offline.locator('body').evaluate(body => body.classList.contains('dark')));
  await offline.evaluate(() => localStorage.setItem('blog-language', 'en'));
  await offline.reload();
  await offline.waitForFunction(() => document.querySelector('#translation-status').textContent === '翻译组件离家出走了喵');
  assert.equal(await offline.locator('#article h3').textContent(), originalTitle);

  const service = { fails: true };
  const { page: failedService } = await createPage({ service });
  await failedService.goto(origin + '/translation-article.html');
  await failedService.locator('[data-language-toggle]').click();
  await failedService.waitForFunction(() => document.documentElement.dataset.translationState === 'error');
  assert.equal(await failedService.locator('h1').textContent(), '这是一篇新的文章');
  service.fails = false;
  await failedService.locator('[data-language-toggle]').click();
  await ready(failedService, 'en');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', library: 'real translate.js 3.18.66', service: 'simulated deterministic responses', checks: ['navigation position and matching styles', 'original loading message', 'English and exact Chinese restoration', 'localStorage refresh', 'friends and independent article navigation', 'cached translation completion', 'dynamic expand/collapse text', 'pre/code and UI exclusions', 'mobile collapsed menu', 'CDN failure and saved-English offline load', 'service failure and retry', 'no uncaught page errors'] }, null, 2));

  if (process.argv.includes('--live')) {
    const { page: live } = await createPage({ live: true });
    const network = [];
    live.on('response', response => {
      const url = new URL(response.url());
      if (url.hostname.includes('microsoft')) network.push({ host: url.hostname, path: url.pathname, status: response.status() });
    });
    live.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.hostname.includes('microsoft')) network.push({ host: url.hostname, path: url.pathname, error: request.failure()?.errorText });
    });
    await live.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await live.locator('[data-language-toggle]').click();
    await live.waitForFunction(() => document.documentElement.lang === 'en' || document.documentElement.dataset.translationState === 'error', null, { timeout: 45000 });
    const result = await live.evaluate(() => ({ state: document.documentElement.dataset.translationState, lang: document.documentElement.lang, version: window.translate?.version || null, heading: document.querySelector('#article h3').textContent, message: document.querySelector('#translation-status').textContent }));
    console.log(JSON.stringify({ liveResult: result, network }, null, 2));
    if (result.lang === 'en') {
      await live.screenshot({ path: path.join(__dirname, 'artifacts', 'translation-live-1440.png') });
      await live.locator('[data-language-toggle]').click();
      await ready(live, 'zh-CN');
      assert.equal(await live.locator('#article h3').textContent(), originalTitle);
      console.log('Live English translation and exact Chinese restoration: PASS');
    }
    assert.deepEqual(errors, []);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.closeAllConnections();
  server.close();
});
