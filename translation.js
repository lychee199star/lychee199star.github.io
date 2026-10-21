(() => {
  'use strict';

  const selects = [...document.querySelectorAll('[data-language-select]')];
  if (!selects.length) return;

  const STORAGE_KEY = 'blog-language';
  const API_HOSTS = [
    'https://api.translate.zvo.cn/translate.json',
    'https://america.api.translate.zvo.cn/translate.json'
  ];
  const LANGUAGES = {
    zh: { api: 'chinese_simplified', html: 'zh-CN' },
    en: { api: 'english', html: 'en' },
    ru: { api: 'russian', html: 'ru' }
  };
  const TRANSLATING = {
    en: '正在翻译为英语，请稍候…',
    ru: '正在翻译为俄语，请稍候…'
  };
  const LOAD_FAILED = '翻译服务暂时不可用，请检查网络后重试。';
  const TRANSLATE_FAILED = '翻译暂时失败，请稍后再试。';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'PRE', 'CODE', 'KBD', 'SAMP', 'TEXTAREA', 'OPTION']);

  const status = document.createElement('div');
  status.id = 'translation-status';
  status.className = 'translation-status notranslate';
  status.setAttribute('translate', 'no');
  status.setAttribute('lang', 'zh-CN');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  document.body.append(status);

  const originals = new Map();
  const rendered = new Map();
  let current = 'zh';
  let wanted = 'zh';
  let revision = 0;
  let busy = false;
  let statusTimer = null;
  let mutationTimer = null;
  let suppressObserver = false;

  function preference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return LANGUAGES[saved] ? saved : 'zh';
    } catch {
      return 'zh';
    }
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

  function updateControls(state = 'ready') {
    document.documentElement.lang = LANGUAGES[current].html;
    document.documentElement.dataset.translationState = state;
    selects.forEach(select => {
      select.value = busy ? wanted : current;
      select.disabled = busy;
      select.setAttribute('aria-busy', String(busy));
    });
  }

  function isTranslatable(node) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue.trim()) return false;
    if (SKIP_TAGS.has(parent.tagName)) return false;
    if (parent.closest('[translate="no"], .notranslate')) return false;
    return true;
  }

  function collectTextNodes(root = document.body) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (isTranslatable(node)) nodes.push(node);
    }
    return nodes;
  }

  function rememberOriginal(node) {
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    return originals.get(node);
  }

  function restoreOriginal() {
    suppressObserver = true;
    for (const [node, value] of originals) {
      if (node.isConnected) node.nodeValue = value;
    }
    suppressObserver = false;
    originals.clear();
    rendered.clear();
  }

  async function requestBatch(texts, target, signal) {
    const body = new URLSearchParams({
      from: 'auto',
      to: LANGUAGES[target].api,
      text: JSON.stringify(texts)
    });
    let lastError = null;
    for (const endpoint of API_HOSTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body,
          signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.result !== 1 || !Array.isArray(data.text) || data.text.length !== texts.length) {
          throw new Error(data.info || 'invalid translation response');
        }
        return data.text;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(LOAD_FAILED);
  }

  async function translateNodes(nodes, target, operation) {
    const unique = [];
    const seen = new Set();
    nodes.forEach(node => {
      if (!node.isConnected || !isTranslatable(node)) return;
      const source = rememberOriginal(node).trim();
      if (!source || seen.has(source)) return;
      seen.add(source);
      unique.push(source);
    });
    if (!unique.length) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const translated = [];
      for (let index = 0; index < unique.length; index += 80) {
        const chunk = unique.slice(index, index + 80);
        translated.push(...await requestBatch(chunk, target, controller.signal));
      }
      if (operation !== revision || wanted !== target) return;
      const dictionary = new Map(unique.map((source, index) => [source, translated[index]]));
      suppressObserver = true;
      nodes.forEach(node => {
        if (!node.isConnected) return;
        const source = rememberOriginal(node).trim();
        const value = dictionary.get(source);
        if (value == null) return;
        const original = rememberOriginal(node);
        const prefix = original.match(/^\s*/)?.[0] || '';
        const suffix = original.match(/\s*$/)?.[0] || '';
        node.nodeValue = `${prefix}${value}${suffix}`;
        rendered.set(node, node.nodeValue);
      });
      suppressObserver = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function switchLanguage(language) {
    if (!LANGUAGES[language] || (language === current && !busy)) {
      updateControls();
      return;
    }
    const operation = ++revision;
    wanted = language;
    busy = language !== 'zh';
    updateControls(busy ? 'loading' : 'ready');
    restoreOriginal();

    if (language === 'zh') {
      current = 'zh';
      savePreference('zh');
      hideStatus();
      return;
    }

    showStatus(TRANSLATING[language]);
    try {
      await translateNodes(collectTextNodes(), language, operation);
      if (operation !== revision || wanted !== language) return;
      current = language;
      busy = false;
      savePreference(language);
      updateControls();
      hideStatus();
    } catch (error) {
      if (operation !== revision) return;
      restoreOriginal();
      current = 'zh';
      wanted = 'zh';
      busy = false;
      updateControls('error');
      showStatus(error.name === 'AbortError' ? LOAD_FAILED : TRANSLATE_FAILED, true);
    }
  }

  function translateMutations(mutations) {
    if (suppressObserver || current === 'zh' || busy) return;
    const changed = new Set();
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData') {
        if (rendered.has(mutation.target) && rendered.get(mutation.target) !== mutation.target.nodeValue) {
          originals.set(mutation.target, mutation.target.nodeValue);
          changed.add(mutation.target);
        }
      } else {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && isTranslatable(node)) changed.add(node);
          if (node.nodeType === Node.ELEMENT_NODE) collectTextNodes(node).forEach(textNode => changed.add(textNode));
        });
      }
    });
    if (!changed.size) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      void translateNodes([...changed], current, revision);
    }, 80);
  }

  const observer = new MutationObserver(translateMutations);
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });

  selects.forEach(select => select.addEventListener('change', () => {
    document.querySelector('.nav-links')?.classList.remove('open');
    document.querySelector('#menu-toggle')?.setAttribute('aria-expanded', 'false');
    void switchLanguage(select.value);
  }));
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY && preference() !== wanted) void switchLanguage(preference());
  });

  updateControls();
  const saved = preference();
  if (saved !== 'zh') void switchLanguage(saved);
})();
