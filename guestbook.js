/* 猫村留言板：独立于原播放器，所有访客文本仅用 textContent / value 处理。 */
(() => {
  'use strict';
  const STORAGE_KEY = 'blog-cat-guestbook-v1';
  const INTERVAL = 10000;
  const LIMIT = 200;
  const form = document.querySelector('#guestbook-form');
  if (!form) return;
  const nickname = document.querySelector('#guestbook-name');
  const message = document.querySelector('#guestbook-message');
  const count = document.querySelector('#guestbook-count');
  const status = document.querySelector('#guestbook-status');
  const notes = document.querySelector('#guestbook-notes');
  const empty = document.querySelector('#guestbook-empty');
  const submit = form.querySelector('[type="submit"]');
  const letters = text => Array.from(text);
  let submitting = false;

  // 存储适配层 1：读取留言。未来对接第三方评论系统时替换此函数，
  // 仍返回 Promise<Array<{id, nickname, content, createdAt, tilt}>>。
  async function readGuestbookMessages() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error('留言记录格式异常');
    return records.filter(item => item && typeof item.nickname === 'string'
      && typeof item.content === 'string' && item.content.trim()
      && letters(item.content).length <= LIMIT
      && Number.isFinite(item.createdAt) && item.createdAt > 0
      && !Number.isNaN(new Date(item.createdAt).getTime()))
      .map(item => ({
        id: String(item.id || item.createdAt),
        nickname: letters(item.nickname).slice(0, 30).join('') || '无名猎人',
        content: item.content,
        createdAt: item.createdAt,
        tilt: Number.isFinite(item.tilt) ? Math.max(-2, Math.min(2, item.tilt)) : 0
      })).sort((a, b) => b.createdAt - a.createdAt);
  }

  // 存储适配层 2：写入留言。未来对接第三方评论系统时替换此函数，
  // 保持入参 {nickname, content}；远端也要验证长度和提交频率。
  // 这两个函数是自定义 UI 的数据边界；giscus 官方嵌入式组件则会替换整块表单/列表。
  async function writeGuestbookMessage(draft) {
    const content = draft.content.trim();
    if (!content) throw new Error('什么都还没写喵，钉子都没处下喵！');
    if (letters(content).length > LIMIT) throw new Error('一张纸条最多写 200 字喵！');
    const records = await readGuestbookMessages();
    const now = Date.now();
    const last = records[0]?.createdAt || 0;
    if (now - last < INTERVAL) {
      const seconds = Math.max(1, Math.ceil((INTERVAL - (now - last)) / 1000));
      throw new Error(`钉子还没钉牢喵，请 ${seconds} 秒后再留言！`);
    }
    const entry = {
      id: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2)}`,
      nickname: letters(draft.nickname.trim()).slice(0, 30).join('') || '无名猎人',
      content, createdAt: now, tilt: Math.random() * 4 - 2
    };
    // 写入成功才返回；被禁用或空间不足时由界面显示错误，不假报成功。
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...records]));
    return entry;
  }

  function notify(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  }
  function updateCount() {
    const chars = letters(message.value);
    if (chars.length > LIMIT) {
      message.value = chars.slice(0, LIMIT).join('');
      notify('一张纸条最多写 200 字喵，已保留前 200 字。', true);
    }
    count.textContent = `${letters(message.value).length} / ${LIMIT} 字`;
    message.removeAttribute('aria-invalid');
  }
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  function renderMessages(records) {
    const fragment = document.createDocumentFragment();
    for (const entry of records) {
      const note = document.createElement('article');
      note.className = 'guestbook-paper';
      note.setAttribute('role', 'listitem');
      note.style.setProperty('--note-tilt', `${entry.tilt}deg`);
      const header = document.createElement('header');
      const author = document.createElement('strong');
      const time = document.createElement('time');
      const content = document.createElement('p');
      // textContent 将输入作为纯文本节点，不将 HTML 字符串解析为标签。
      author.textContent = entry.nickname;
      content.textContent = entry.content;
      time.dateTime = new Date(entry.createdAt).toISOString();
      time.textContent = formatTime(entry.createdAt);
      header.append(author, time);
      note.append(header, content);
      fragment.append(note);
    }
    notes.replaceChildren(fragment);
    empty.hidden = records.length !== 0;
  }
  async function refreshMessages() {
    try {
      renderMessages(await readGuestbookMessages());
    } catch {
      empty.hidden = true;
      notify('暂时无法读取本地留言喵，请检查浏览器存储设置。', true);
    }
  }
  message.addEventListener('input', event => { if (!event.isComposing) updateCount(); });
  message.addEventListener('compositionend', updateCount);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    if (!message.value.trim()) {
      notify('什么都还没写喵，钉子都没处下喵！', true);
      message.setAttribute('aria-invalid', 'true');
      message.focus();
      return;
    }
    if (letters(message.value.trim()).length > LIMIT) {
      notify('一张纸条最多写 200 字喵！', true);
      return;
    }
    submitting = true;
    submit.disabled = true;
    try {
      await writeGuestbookMessage({nickname: nickname.value, content: message.value});
      message.value = '';
      updateCount();
      notify('钉好了喵！本喵这就去汇报村长喵！');
      await refreshMessages();
    } catch (error) {
      const validationError = /喵/.test(error.message);
      notify(validationError ? error.message : '未能保存留言喵，请检查浏览器存储设置或剩余空间。', true);
    } finally {
      submitting = false;
      submit.disabled = false;
    }
  });
  // 同一来源的其他标签页有更新时同步显示；刷新后也保留提交间隔。
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) refreshMessages();
  });
  refreshMessages();
})();
