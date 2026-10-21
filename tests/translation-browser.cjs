// 使用真实 translate.js；自动化用模拟响应验证边界，--live 额外验证真实 CDN 和在线机翻。
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
const selectHTML = '<label class="language-picker notranslate" translate="no"><span class="sr-only">页面语言</span><select class="translation-select notranslate" data-language-select aria-label="选择页面语言" title="机翻仅供参喵"><option value="zh">中文</option><option value="en">English</option><option value="ru">Русский</option></select></label>';
const imports = `<script id="translate-cdn" defer src="${CDN}" onerror="this.dataset.failed='true'"></script><script src="translation.js" defer></script>`;
const article = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文章测试</title><link rel="stylesheet" href="styles.css"></head><body><nav class="top-nav"><div class="nav-links"><a href="friends.html">友链</a>${selectHTML}</div></nav><main><h1>这是一篇新的文章</h1><p>不同页面也应该记住我选择的语言。</p><pre><code>const message = "代码保持中文";</code></pre></main>${imports}</body></html>`;
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
const translations = {
  en: new Map([
    ['首页', 'Home'], ['文章', 'Articles'], ['关于我', 'About me'], ['友链', 'Friends'],
    ['做一个让自己愿意反复打开的学习系统', 'A learning system worth returning to'],
    ['同行猎人名录', 'Fellow Hunters'], ['这是一篇新的文章', 'This is a new article'],
    ['展开', 'Expand'], ['收起', 'Collapse']
  ]),
  ru: new Map([
    ['首页', 'Главная'], ['文章', 'Статьи'], ['关于我', 'Обо мне'], ['友链', 'Друзья'],
    ['做一个让自己愿意反复打开的学习系统', 'Система обучения, к которой хочется возвращаться'],
    ['同行猎人名录', 'Коллеги-охотники'], ['这是一篇新的文章', 'Это новая статья'],
    ['展开', 'Развернуть'], ['收起', 'Свернуть']
  ])
};

async function createPage({ mobile = false, cdnFails = false, service = { fails: false }, live = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.route('https://cdn.jsdelivr.net/**', route => route.abort());
  const payloads = [];
  if (!live) {
    await context.route(CDN, route => cdnFails ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: library }));
    await context.route('https://api.translate.zvo.cn/**', async route => {
      if (service.fails) return route.abort();
      const params = new URLSearchParams(route.request().postData() || '');
      let rawText = params.get('text') || '[]';
      let values = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          values = JSON.parse(rawText);
          break;
        } catch {
          rawText = decodeURIComponent(rawText);
        }
      }
      const requested = params.get('to');
      const target = requested === 'russian' ? 'ru' : 'en';
      payloads.push(...values.map(item => ({ target, text: item })));
      await new Promise(resolve => setTimeout(resolve, 250));
      const fallback = target === 'ru' ? 'Русский текст' : 'English text';
      const result = values.map(item => translations[target].get(item.trim()) || item.replace(/[\u3400-\u9fff]+/g, fallback));
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 1, info: 'SUCCESS', from: params.get('from'), to: requested, text: result }), headers: { 'Access-Control-Allow-Origin': '*' } });
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

async function ready(page, language, value) {
  await page.waitForFunction(language => document.documentElement.lang === language && document.documentElement.dataset.translationState === 'ready', language);
  assert.equal(await page.locator('[data-language-select]').inputValue(), value);
  assert.equal(await page.locator('#translation-status').isVisible(), false);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { page, payloads } = await createPage();
  await page.goto(origin + '/index.html');
  await ready(page, 'zh-CN', 'zh');
  assert(await page.locator('[data-language-select]').evaluate(select => select.closest('label').previousElementSibling.getAttribute('href') === 'friends.html'));
  assert.equal(await page.locator('[data-language-select]').getAttribute('title'), '机翻仅供参喵');
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
  await page.locator('[data-language-select]').selectOption('en');
  assert.equal(await page.locator('#translation-status').textContent(), '正在翻译为英语，请稍候…');
  await ready(page, 'en', 'en');
  assert.equal((await page.locator('#article h3').textContent()).trim(), 'A learning system worth returning to');
  assert.equal(await page.locator('#translation-code-probe').textContent(), 'const message = "代码保持中文";');
  assert(payloads.some(item => item.target === 'en' && item.text.trim() === originalTitle));
  assert(!payloads.some(item => item.text.includes('代码保持中文') || item.text.includes('机翻仅供参喵') || item.text.includes('正在翻译')));
  assert.equal(await page.evaluate(() => localStorage.getItem('blog-language')), 'en');
  await page.locator('#post-group-学习').click();
  await page.locator('#learning-post-copy .expand-toggle').click();
  await page.waitForFunction(() => document.querySelector('#learning-post-copy .expand-toggle').textContent.includes('Collapse'));
  await page.locator('#learning-post-copy .expand-toggle').click();
  await page.waitForFunction(() => document.querySelector('#learning-post-copy .expand-toggle').textContent.includes('Expand'));
  await page.locator('[data-language-select]').selectOption('ru');
  assert.equal(await page.locator('#translation-status').textContent(), '正在翻译为俄语，请稍候…');
  await ready(page, 'ru', 'ru');
  assert.equal((await page.locator('#article h3').textContent()).trim(), 'Система обучения, к которой хочется возвращаться');
  assert(payloads.some(item => item.target === 'ru' && item.text.trim() === originalTitle));
  assert.equal(await page.evaluate(() => localStorage.getItem('blog-language')), 'ru');
  await page.locator('[data-language-select]').selectOption('zh');
  await ready(page, 'zh-CN', 'zh');
  assert.equal(await page.locator('#article h3').textContent(), originalTitle);
  assert.equal(await page.locator('#learning-post-copy > p').textContent(), originalParagraph);
  await page.locator('[data-language-select]').selectOption('en');
  await ready(page, 'en', 'en'); // 已有翻译缓存时也必须结束提示。
  await page.reload();
  await ready(page, 'en', 'en');
  await page.locator('.nav-links a[href="friends.html"]').click();
  await page.waitForURL('**/friends.html');
  await ready(page, 'en', 'en');
  assert.equal((await page.locator('h1').textContent()).trim(), 'Fellow Hunters');
  await page.goto(origin + '/translation-article.html');
  await ready(page, 'en', 'en');
  assert.equal((await page.locator('h1').textContent()).trim(), 'This is a new article');
  assert.equal(await page.locator('code').textContent(), 'const message = "代码保持中文";');
  await page.locator('[data-language-select]').selectOption('zh');
  await ready(page, 'zh-CN', 'zh');
  assert.equal(await page.locator('h1').textContent(), '这是一篇新的文章');

  const { page: mobile } = await createPage({ mobile: true });
  await mobile.goto(origin + '/index.html');
  await mobile.locator('#menu-toggle').tap();
  assert(await mobile.locator('[data-language-select]').isVisible());
  await mobile.locator('[data-language-select]').selectOption('ru');
  await ready(mobile, 'ru', 'ru');
  await mobile.locator('#menu-toggle').tap();
  await mobile.locator('[data-language-select]').selectOption('zh');
  await ready(mobile, 'zh-CN', 'zh');
  await mobile.locator('#menu-toggle').tap();
  fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
  await mobile.screenshot({ path: path.join(__dirname, 'artifacts', 'translation-menu-375.png') });

  const { page: offline } = await createPage({ cdnFails: true });
  await offline.goto(origin + '/index.html');
  await offline.locator('[data-language-select]').selectOption('en');
  await offline.waitForFunction(() => document.querySelector('#translation-status').textContent === '翻译组件加载失败，请检查网络后重试。');
  assert.equal(await offline.locator('#article h3').textContent(), originalTitle);
  assert.equal(await offline.locator('[data-language-select]').isEnabled(), true);
  await offline.locator('#theme-toggle').click();
  assert(await offline.locator('body').evaluate(body => body.classList.contains('dark')));
  await offline.evaluate(() => localStorage.setItem('blog-language', 'en'));
  await offline.reload();
  await offline.waitForFunction(() => document.querySelector('#translation-status').textContent === '翻译组件加载失败，请检查网络后重试。');
  assert.equal(await offline.locator('#article h3').textContent(), originalTitle);

  const service = { fails: true };
  const { page: failedService } = await createPage({ service });
  await failedService.goto(origin + '/translation-article.html');
  await failedService.locator('[data-language-select]').selectOption('ru');
  await failedService.waitForFunction(() => document.documentElement.dataset.translationState === 'error');
  assert.equal(await failedService.locator('h1').textContent(), '这是一篇新的文章');
  service.fails = false;
  await failedService.locator('[data-language-select]').selectOption('ru');
  await ready(failedService, 'ru', 'ru');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', library: 'real translate.js', service: 'simulated deterministic responses', checks: ['three-language selector', 'English and Russian translation', 'exact Chinese restoration', 'localStorage refresh', 'article groups included in translation', 'friends and independent article navigation', 'cached translation completion', 'dynamic expand/collapse text', 'pre/code and UI exclusions', 'mobile collapsed menu', 'CDN failure and saved-language offline load', 'service failure and retry', 'no uncaught page errors'] }, null, 2));

  if (process.argv.includes('--live')) {
    const { page: live } = await createPage({ live: true });
    const network = [];
    live.on('response', response => {
      const url = new URL(response.url());
      if (url.hostname.includes('translate.zvo.cn')) network.push({ host: url.hostname, path: url.pathname, status: response.status() });
    });
    live.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.hostname.includes('translate.zvo.cn')) network.push({ host: url.hostname, path: url.pathname, error: request.failure()?.errorText });
    });
    await live.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await live.locator('[data-language-select]').selectOption('ru');
    await live.waitForFunction(() => document.documentElement.lang === 'ru' || document.documentElement.dataset.translationState === 'error', null, { timeout: 45000 });
    const result = await live.evaluate(() => ({ state: document.documentElement.dataset.translationState, lang: document.documentElement.lang, version: window.translate?.version || null, heading: document.querySelector('#article h3').textContent, message: document.querySelector('#translation-status').textContent }));
    console.log(JSON.stringify({ liveResult: result, network }, null, 2));
    if (result.lang === 'ru') {
      await live.screenshot({ path: path.join(__dirname, 'artifacts', 'translation-live-1440.png') });
      await live.locator('[data-language-select]').selectOption('zh');
      await ready(live, 'zh-CN', 'zh');
      assert.equal(await live.locator('#article h3').textContent(), originalTitle);
      console.log('Live Russian translation and exact Chinese restoration: PASS');
    }
    assert.deepEqual(errors, []);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.closeAllConnections();
  server.close();
});
