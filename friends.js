/* 友链页逻辑：仅依赖 friends.html 内的 friendLinks 数据数组。 */
'use strict';

// 博客地址仅允许 http/https；无协议地址自动补 https://。
function normalizeFriendURL(value) {
  if (typeof value !== 'string') return null;
  let candidate = value.trim();
  if (!candidate || /[\s\\\u0000-\u001f\u007f]/.test(candidate)) return null;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(candidate)) return null;
    candidate = candidate.replace(/^\/\//, '');
    if (candidate.startsWith('/')) return null;
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

function normalizeFriendAvatar(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    // 头像也允许 assets/avatar.jpg 这样的站内相对地址。
    const url = new URL(value.trim(), document.baseURI);
    return ['http:', 'https:'].includes(url.protocol)
      || (location.protocol === 'file:' && url.protocol === 'file:') ? url.href : null;
  } catch { return null; }
}

function renderFriendLinks(links) {
  const grid = document.querySelector('#friend-grid');
  if (!grid) return;
  const fragment = document.createDocumentFragment();
  let count = 0;
  for (const friend of Array.isArray(links) ? links : []) {
    const url = normalizeFriendURL(friend?.url);
    if (!url || typeof friend.name !== 'string' || !friend.name.trim()) continue;
    const card = document.createElement('a');
    card.className = 'friend-card';
    card.href = url.href;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.setProperty('--card-tilt', `${(Math.random() * 3 - 1.5).toFixed(2)}deg`);
    card.setAttribute('aria-label', `${friend.name.trim()}的博客（在新标签页打开）`);
    const avatar = document.createElement('span');
    avatar.className = 'friend-avatar';
    const paw = document.createElement('span');
    paw.className = 'paw-placeholder';
    paw.setAttribute('aria-hidden', 'true');
    avatar.append(paw);
    const avatarURL = normalizeFriendAvatar(friend.avatar);
    if (avatarURL) {
      const img = document.createElement('img');
      img.alt = '';
      img.width = 64;
      img.height = 64;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      // 保留图片布局以便懒加载触发，加载完成前透明显示底层猫爪。
      img.classList.add('is-loading');
      img.addEventListener('load', () => {
        img.hidden = img.naturalWidth === 0;
        img.classList.remove('is-loading');
      });
      // 失败时隐藏图片，露出已经在底层绘制的猫爪，不会循环重试。
      img.addEventListener('error', () => {img.hidden = true;});
      img.src = avatarURL;
      avatar.append(img);
    }
    const name = document.createElement('strong');
    name.className = 'friend-name';
    name.textContent = friend.name.trim();
    const desc = document.createElement('p');
    desc.className = 'friend-desc';
    desc.textContent = typeof friend.desc === 'string' ? friend.desc : '';
    const domain = document.createElement('span');
    domain.className = 'friend-domain';
    domain.textContent = url.host;
    const fish = document.createElement('span');
    fish.className = 'friend-fish';
    fish.textContent = '🐟';
    fish.setAttribute('aria-hidden', 'true');
    card.append(avatar, name, desc, domain, fish);
    fragment.append(card);
    count++;
  }
  grid.replaceChildren(fragment);
  document.querySelector('#friends-empty').hidden = count !== 0;
  document.querySelector('#friends-count').textContent = `${String(count).padStart(2, '0')} 位同行猎人`;
}

renderFriendLinks(friendLinks);

// 复制本喵名片；浏览器不允许写剪贴板时提供已选中的文字供手动复制。
document.querySelector('#copy-own-card').addEventListener('click', async () => {
  const text = [...document.querySelectorAll('#own-card-details > div')]
    .map(row => `${row.querySelector('dt').textContent}：${row.querySelector('dd').textContent}`).join('\n');
  const status = document.querySelector('#copy-card-status');
  const fallback = document.querySelector('#copy-card-fallback');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    fallback.hidden = true;
    status.textContent = text.includes('【填') ? '已复制喵！名片还有待填项，交换前记得补齐。' : '名片复制好了喵！';
  } catch {
    fallback.value = text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    status.textContent = '请复制下方已选中的名片文字喵。';
  }
});
