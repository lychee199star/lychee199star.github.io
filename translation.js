(() => {
  'use strict';

  // translate.js 固定版本 3.18.66（库内版本 3.18.66.20250930）。
  // CDN: https://cdn.staticfile.net/translate.js/3.18.66/translate.js
  // 使用库自带的 client.edge 模式；本项目不直接调用翻译 API，不配置 key 或后端。
  const buttons = [...document.querySelectorAll('[data-language-toggle]')];
  if (!buttons.length) return;
  const STORAGE_KEY = 'blog-language';
  const TRANSLATING = '本喵正在翻译喵，稍等一下下！';
  const LOAD_FAILED = '翻译组件离家出走了喵';
  const TRANSLATE_FAILED = '翻译暂时迷路了喵，请稍后再试！';
  const requests = new Set();
  const status = document.createElement('div');
  status.id = 'translation-status';
  status.className = 'translation-status notranslate';
  status.setAttribute('translate', 'no');
  status.setAttribute('lang', 'zh-CN');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  document.body.append(status);

  let engine = null;
  let loader = null;
  let current = 'zh';
  let wanted = 'zh';
  let revision = 0;
  let busy = false;
  let deadline = null;
  let statusTimer = null;
  let finishTimer = null;
  let activeJob = null;

  function preference() {
    try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'; }
    catch { return 'zh'; }
  }

  function savePreference(language) {
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* 存储受限时仍可切换当前页面。 */ }
  }

  function showStatus(message, temporary = false) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.hidden = false;
    if (temporary) statusTimer = setTimeout(hideStatus, 5000);
  }

  function hideStatus() {
    clearTimeout(statusTimer);
    status.hidden = true;
    status.textContent = '';
  }

  function updateButtons(state = 'ready') {
    document.documentElement.lang = current === 'en' ? 'en' : 'zh-CN';
    document.documentElement.dataset.translationState = state;
    buttons.forEach(button => {
      button.textContent = current === 'en' ? '中' : '译/EN';
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(current === 'en'));
      button.setAttribute('aria-busy', String(busy));
      button.setAttribute('aria-label', current === 'en' ? '切换为中文' : '切换为英文');
    });
  }

  function loadLibrary() {
    if (window.translate?.version && typeof window.translate.execute === 'function') return Promise.resolve(window.translate);
    const script = document.querySelector('#translate-cdn');
    if (!script || script.dataset.failed === 'true') return Promise.reject(new Error(LOAD_FAILED));
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        script.removeEventListener('load', loaded);
        script.removeEventListener('error', failed);
      };
      const loaded = () => {
        cleanup();
        if (window.translate?.version && typeof window.translate.execute === 'function') resolve(window.translate);
        else reject(new Error(LOAD_FAILED));
      };
      const failed = () => { cleanup(); reject(new Error(LOAD_FAILED)); };
      const timer = setTimeout(failed, 12000);
      script.addEventListener('load', loaded, { once: true });
      script.addEventListener('error', failed, { once: true });
    }).catch(error => { loader = null; throw error; });
    return loader;
  }

  function stopRequests() {
    // 取消库已经发出的请求，避免超时后旧响应又把恢复的中文覆盖掉。
    for (const xhr of requests) {
      xhr.onreadystatechange = null;
      xhr.abort();
    }
    requests.clear();
  }

  function restoreOriginal() {
    if (!engine) return;
    engine.reset({ selectLanguageRefreshRender: false, notTranslateTip: false });
    engine.to = 'chinese_simplified';
    engine.storage.set('to', 'chinese_simplified');
  }

  function failTranslation(message = TRANSLATE_FAILED) {
    if (wanted !== 'en') return;
    wanted = 'zh';
    revision++;
    activeJob = null;
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    stopRequests();
    // 让库当前回调退出后再还原，保留 DOM 节点及原来的事件监听。
    finishTimer = setTimeout(() => {
      try { restoreOriginal(); } catch { /* 原页面始终可见，不隐藏正文。 */ }
      current = 'zh';
      busy = false;
      updateButtons('error');
      showStatus(message, true);
    }, 20);
  }

  function configureLibrary(library) {
    if (engine) return;
    engine = library;
    engine.selectLanguageTag.show = false;
    engine.autoDiscriminateLocalLanguage = false;
    engine.language.setLocal('chinese_simplified');
    engine.service.use('client.edge');
    engine.ignore.tag = [...new Set([...engine.ignore.tag, 'pre', 'code', 'kbd', 'samp', 'canvas', 'svg', 'noscript'])];
    engine.ignore.class = [...new Set([...engine.ignore.class, 'notranslate'])];
    document.querySelectorAll('[translate="no"]').forEach(element => element.classList.add('notranslate'));
    engine.listener.start(); // 展开按钮、搜索结果等动态文字也跟随当前语言。

    // 只封装库自身的请求回调，不创建新的翻译接口；超时和晚到的响应均可安全取消。
    const send = engine.request.send.bind(engine.request);
    engine.request.send = function(...args) {
      const requestRevision = revision;
      const success = args[3];
      args[3] = data => {
        if (requestRevision !== revision || wanted !== 'en') return;
        try { success(data); } catch { failTranslation(); }
      };
      args[7] = () => {
        if (requestRevision === revision && wanted === 'en') failTranslation();
      };
      const xhr = send(...args);
      if (xhr) {
        requests.add(xhr);
        xhr.timeout = 20000;
        const failed = () => {
          if (requestRevision === revision && wanted === 'en') failTranslation();
        };
        xhr.addEventListener('error', failed, { once: true });
        xhr.addEventListener('timeout', failed, { once: true });
        xhr.addEventListener('loadend', () => requests.delete(xhr), { once: true });
      }
      return xhr;
    };
    engine.lifecycle.execute.trigger.push(() => wanted === 'en');
    engine.lifecycle.execute.start.push(data => {
      if (activeJob && data.to === 'english') activeJob.uuids.add(data.uuid);
    });
    engine.lifecycle.execute.translateNetworkAfter.push(data => {
      if (wanted === 'en' && data.result !== 1) failTranslation();
    });
    engine.lifecycle.execute.renderFinish.push((uuid, to) => {
      if (wanted !== 'en' || to !== 'english' || !activeJob?.uuids.has(uuid)) return;
      activeJob.uuids.delete(uuid);
      if (activeJob.uuids.size > 0) return;
      const completedRevision = revision;
      clearTimeout(finishTimer);
      finishTimer = setTimeout(() => {
        if (completedRevision !== revision || wanted !== 'en') return;
        clearTimeout(deadline);
        activeJob = null;
        current = 'en';
        busy = false;
        savePreference('en');
        updateButtons();
        hideStatus();
      }, 0);
    });
  }

  async function switchLanguage(language) {
    const operation = ++revision;
    wanted = language;
    activeJob = null;
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    stopRequests();
    if (language === 'zh') {
      try { restoreOriginal(); } catch { /* CDN 不可用也能保留中文页面。 */ }
      current = 'zh';
      busy = false;
      savePreference('zh');
      updateButtons();
      hideStatus();
      return;
    }

    busy = true;
    updateButtons('loading');
    showStatus(TRANSLATING);
    let library;
    try { library = await loadLibrary(); }
    catch {
      if (operation === revision) failTranslation(LOAD_FAILED);
      return;
    }
    if (operation !== revision) return;
    try {
      configureLibrary(library);
      activeJob = { uuids: new Set() };
      deadline = setTimeout(() => failTranslation(), 30000);
      // 必须使用 english，不能使用旧版 en（旧版属于已废弃的 Google 组件）。
      engine.changeLanguage('english');
    } catch { failTranslation(); }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    document.querySelector('.nav-links')?.classList.remove('open');
    document.querySelector('#menu-toggle')?.setAttribute('aria-expanded', 'false');
    void switchLanguage(current === 'en' ? 'zh' : 'en');
  }));
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY && preference() !== wanted) void switchLanguage(preference());
  });
  updateButtons();
  const applyPreference = () => { if (preference() === 'en') void switchLanguage('en'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPreference, { once: true });
  else applyPreference();
})();
