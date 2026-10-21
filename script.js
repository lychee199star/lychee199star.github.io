// 状态随便改，一条配一个颜文字，情绪要和台词匹配
const CAT_STATUS_ITEMS = [
  { kaomoji: '(^・ω・^ )', text: '今天心情好到尾巴都翘起来啦，老大也要开开心心的喵！' },
  { kaomoji: '(。-ω-)zzz', text: '老大……本喵眼睛要睁不开了，借个肩膀靠一靠喵……' },
  { kaomoji: '(≧▽≦)', text: '老大，本喵的肚子在敲鼓了，今天开饭能不能提前一点喵？' },
  { kaomoji: '(￣^￣)', text: '本喵才没有一直盯着门口等老大回来呢，只是刚好路过喵！' },
  { kaomoji: '(=^･ω･^=)', text: '老大～抱一下嘛，就一下，本喵今天乖得不得了喵！' },
  { kaomoji: '(｀皿´)', text: '哼，老大居然忘了给本喵留小鱼干，本喵宣布绝交三分钟喵！' },
  { kaomoji: '(｡•́︿•̀｡)', text: '老大今天眉头皱了一下午，遇到什么难事了吗？本喵会陪着你喵。' },
  { kaomoji: '(☆▽☆)', text: '老大老大！本喵刚发现了被窝里最舒服的角落，分你一半喵！' },
  { kaomoji: '(´;ω;｀)', text: '老大是不是不喜欢本喵了……今天的摸头比昨天少了十七下喵……' },
  { kaomoji: '(・_・?)', text: '老大，为什么人类要把闹钟放床头？那不是每天都被吓醒喵？' },
  { kaomoji: '(￣▽￣)ノ', text: '嘿嘿，本喵今天学会开门了，老大以后藏零食要换个地方喵！' },
  { kaomoji: '(￣～￣)', text: '老大不在的时候时间过得好慢……本喵都数完第七十七次天花板裂缝了喵。' },
  { kaomoji: '(★ω★)', text: '老大，周末带本喵出去晒太阳好不好？本喵保证不抓鸟喵！' },
  { kaomoji: 'Σ(°Д°)', text: '老大！！本喵听到风声说下周有考试！要不要躲进被窝避难喵？' },
  { kaomoji: '(´▽｀)', text: '老大手好暖和，本喵就赖在你怀里五分钟……五分钟……再五分钟喵。' },
  { kaomoji: '(＞ω＜)', text: '老大看我看我！本喵新学的歪头杀，有没有被可爱到喵？' },
  { kaomoji: '(￢_￢)', text: '今天的本喵是高冷猫格，老大可以崇拜本喵，但不要摸头喵。' },
  { kaomoji: '(；一_一)', text: '老大，饭要按时吃、觉要早点睡、出门记得带伞……本喵越来越像猫妈妈了喵。' },
  { kaomoji: 'ᕙ(＠°▽°＠)ᕗ', text: '早啊老大！今天也是元气满满的一天，一起加油打怪升级喵！' },
  { kaomoji: '(´-ω-`)', text: '老大还没睡吗……本喵也睡不着，那本喵陪你一起看星星好了喵。' }
];

// 名单随便改，按 {name, url} 格式加一条就行
const siteList = [
  { name: '中国大学MOOC', url: 'https://www.icourse163.org/' },
  { name: '智慧树', url: 'https://www.zhihuishu.com/' },
  { name: '超星学习通', url: 'https://www.chaoxing.com/' },
  { name: 'B站', url: 'https://www.bilibili.com/' },
  { name: '学信网', url: 'https://www.chsi.com.cn/' },
  { name: '中国知网', url: 'https://www.cnki.net/' },
  { name: '万方数据', url: 'https://www.wanfangdata.com.cn/' },
  { name: '国家图书馆', url: 'https://www.nlc.cn/' },
  { name: '研招网', url: 'https://yz.chsi.com.cn/' },
  { name: '四六级', url: 'https://cet.neea.edu.cn/' },
  { name: '24365就业', url: 'https://www.ncss.cn/' },
  { name: '百度网盘', url: 'https://pan.baidu.com/' },
  { name: '腾讯文档', url: 'https://docs.qq.com/' },
  { name: '石墨文档', url: 'https://shimo.im/' },
  { name: 'GitHub', url: 'https://github.com/' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/' },
  { name: 'CSDN', url: 'https://www.csdn.net/' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { name: 'Kimi', url: 'https://kimi.moonshot.cn/' },
  { name: '豆包', url: 'https://www.doubao.com/' },
  { name: '文心一言', url: 'https://yiyan.baidu.com/' },
  { name: '智谱清言', url: 'https://chatglm.cn/' },
  { name: '讯飞星火', url: 'https://xinghuo.xfyun.cn/' },
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Claude', url: 'https://claude.ai/' },
  { name: 'Gemini', url: 'https://gemini.google.com/' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai/' },
  { name: 'Cursor', url: 'https://www.cursor.com/' },
  { name: 'Midjourney', url: 'https://www.midjourney.com/' },
  { name: '即梦', url: 'https://jimeng.jianying.com/' }
];

const body = document.body;
const progress = document.querySelector('.reading-progress span');
const themeToggle = document.querySelector('#theme-toggle');
const menuToggle = document.querySelector('#menu-toggle');
const navLinks = document.querySelector('.nav-links');
const searchToggle = document.querySelector('#search-toggle');
const searchOverlay = document.querySelector('#search-overlay');
const searchClose = document.querySelector('#search-close');
const searchInput = document.querySelector('#search-input');
const searchResults = document.querySelector('#search-results');
const newsletterForm = document.querySelector('#newsletter-form');
const formNote = document.querySelector('#form-note');
const catFace = document.querySelector('#cat-face');
const catStatusText = document.querySelector('#cat-status-text');
const catStatusDate = document.querySelector('#cat-status-date');
const catStatus = document.querySelector('#cat-status');
const portalTrack = document.querySelector('#portal-track');
const welcomeOverlay = document.querySelector('#welcome-overlay');
const welcomeClose = document.querySelector('#welcome-close');
const welcomeDismissToday = document.querySelector('#welcome-dismiss-today');
const welcomePreferenceStatus = document.querySelector('#welcome-preference-status');
const welcomePreferenceKey = 'blog-welcome-hidden-date-v1';
const welcomeReturnFocus = document.activeElement === body ? document.querySelector('.brand') : document.activeElement;

// 保存本地日历日期，而不是滚动的 24 小时；服务器部署后仍由各访客的浏览器分别保存。
function welcomeDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isWelcomeHiddenToday() {
  try {
    const savedDate = localStorage.getItem(welcomePreferenceKey);
    const today = welcomeDateKey();
    if (savedDate && savedDate !== today) localStorage.removeItem(welcomePreferenceKey);
    return savedDate === today;
  } catch {
    return false;
  }
}

function closeWelcome() {
  if (!welcomeOverlay?.classList.contains('open')) return;
  if (welcomeOverlay.contains(document.activeElement)) welcomeReturnFocus?.focus({ preventScroll: true });
  welcomeOverlay.classList.remove('open');
  welcomeOverlay.setAttribute('aria-hidden', 'true');
  welcomeOverlay.inert = true;
  if (!searchOverlay?.classList.contains('open')) body.classList.remove('no-scroll');
}

if (welcomeOverlay) {
  const welcomeDialog = welcomeOverlay.querySelector('.welcome-dialog');
  const thursdayContent = document.querySelector('#welcome-thursday');

  function syncWelcomeDay() {
    const isThursday = new Date().getDay() === 4 && !!thursdayContent;
    welcomeDialog.classList.toggle('welcome-dialog--thursday', isThursday);
    welcomeDialog.setAttribute('aria-labelledby', isThursday ? 'thursday-title' : 'welcome-title');
    welcomeOverlay.querySelector('.welcome-art').hidden = isThursday;
    welcomeOverlay.querySelector('.welcome-copy').hidden = isThursday;
    if (thursdayContent) thursdayContent.hidden = !isThursday;
    welcomeClose.textContent = isThursday ? '收到啦喵！' : 'MEOW！';
    welcomeDismissToday.checked = isWelcomeHiddenToday();
    if (welcomeDismissToday.checked) closeWelcome();
  }

  syncWelcomeDay();
  if (!welcomeDismissToday.checked) {
    welcomeOverlay.inert = false;
    welcomeOverlay.setAttribute('aria-hidden', 'false');
    welcomeOverlay.classList.add('open');
    body.classList.add('no-scroll');
    welcomeClose?.focus({ preventScroll: true });
  }

  welcomeDismissToday.addEventListener('change', () => {
    try {
      if (welcomeDismissToday.checked) localStorage.setItem(welcomePreferenceKey, welcomeDateKey());
      else localStorage.removeItem(welcomePreferenceKey);
      welcomePreferenceStatus.hidden = true;
      welcomePreferenceStatus.textContent = '';
    } catch {
      welcomeDismissToday.checked = isWelcomeHiddenToday();
      welcomePreferenceStatus.textContent = '未能保存，请允许浏览器保存网站数据后重试。';
      welcomePreferenceStatus.hidden = false;
    }
  });
  welcomeClose?.addEventListener('click', closeWelcome);
  welcomeOverlay.addEventListener('click', event => {
    if (event.target === welcomeOverlay) closeWelcome();
  });
  document.addEventListener('keydown', event => {
    if (!welcomeOverlay.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWelcome();
    }
    if (event.key === 'Tab') {
      const first = welcomeDismissToday;
      const last = welcomeClose;
      const focusOutside = !welcomeOverlay.contains(document.activeElement);
      if (focusOutside || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }
  });

  // 零点清除当天选择，但不打断正在阅读的人；下次打开页面恢复弹窗。
  let welcomeResetTimer;
  function scheduleWelcomeReset() {
    clearTimeout(welcomeResetTimer);
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    welcomeResetTimer = setTimeout(() => {
      syncWelcomeDay();
      scheduleWelcomeReset();
    }, Math.max(1, midnight.getTime() - Date.now()));
  }
  scheduleWelcomeReset();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    syncWelcomeDay();
    scheduleWelcomeReset();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    syncWelcomeDay();
    scheduleWelcomeReset();
  });
  window.addEventListener('storage', event => {
    if (event.key === welcomePreferenceKey || event.key === null) syncWelcomeDay();
  });
}

const catStatusStorageKey = 'blog-cat-status-v1';

function renderDailyCatStatus() {
  if (!catFace || !catStatusText || !catStatusDate || !CAT_STATUS_ITEMS.length) return;

  const now = new Date();
  const today = welcomeDateKey(now);
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(catStatusStorageKey) || 'null');
  } catch {
    saved = null;
  }

  const isValidSaved = saved && saved.date === today
    && Number.isInteger(saved.index)
    && saved.index >= 0
    && saved.index < CAT_STATUS_ITEMS.length;
  let index = isValidSaved ? saved.index : Math.floor(Math.random() * CAT_STATUS_ITEMS.length);
  const changedDay = !isValidSaved;
  if (changedDay && saved && Number.isInteger(saved.index) && CAT_STATUS_ITEMS.length > 1 && index === saved.index) {
    index = (index + 1 + Math.floor(Math.random() * (CAT_STATUS_ITEMS.length - 1))) % CAT_STATUS_ITEMS.length;
  }

  if (changedDay) {
    try { localStorage.setItem(catStatusStorageKey, JSON.stringify({ date: today, index })); } catch { /* 存储不可用时仍正常显示 */ }
  }

  const item = CAT_STATUS_ITEMS[index];
  catFace.textContent = item.kaomoji;
  catStatusText.textContent = item.text;
  catStatusDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日`;
  if (changedDay && catStatus && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    catStatus.classList.remove('cat-status--fade-in');
    void catStatus.offsetWidth;
    catStatus.classList.add('cat-status--fade-in');
  }
}

renderDailyCatStatus();

function renderSitePortal() {
  if (!portalTrack || !siteList.length) return;
  const createGroup = () => {
    const group = document.createElement('div');
    group.className = 'portal-group';
    siteList.forEach(site => {
      const link = document.createElement('a');
      link.className = 'portal-link notranslate';
      link.href = site.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = site.name;
      group.appendChild(link);
    });
    return group;
  };
  const firstGroup = createGroup();
  const secondGroup = createGroup();
  secondGroup.setAttribute('aria-hidden', 'true');
  secondGroup.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });
  portalTrack.replaceChildren(firstGroup, secondGroup);
}

renderSitePortal();

window.addEventListener('scroll', () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${scrollable ? (window.scrollY / scrollable) * 100 : 0}%`;
}, { passive: true });

// 首屏滚动转换：把滚动进度写入 --hero-scroll（0~1），CSS 负责全部变换。
const heroSection = document.querySelector('.site-header');
if (heroSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let heroTicking = false;
  const updateHeroScroll = () => {
    const height = Math.max(1, heroSection.offsetHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / height));
    document.documentElement.style.setProperty('--hero-scroll', progress.toFixed(4));
    heroTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!heroTicking) {
      heroTicking = true;
      window.requestAnimationFrame(updateHeroScroll);
    }
  }, { passive: true });
  updateHeroScroll();
}

themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  themeToggle.textContent = body.classList.contains('dark') ? '☼' : '◐';
  localStorage.setItem('blog-theme', body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('blog-theme') === 'dark') { body.classList.add('dark'); themeToggle.textContent = '☼'; }

// 顶部菜单滑动下划线：悬停时滑到目标项，离开后滑回激活项。
const navUnderlineHost = document.querySelector('.nav-links');
if (navUnderlineHost && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const underline = document.createElement('span');
  underline.className = 'nav-underline';
  underline.setAttribute('aria-hidden', 'true');
  navUnderlineHost.appendChild(underline);
  const navItems = navUnderlineHost.querySelectorAll('a, .translation-toggle');
  const activeNavItem = navUnderlineHost.querySelector('.active') || navItems[0];
  let lastNavItem = activeNavItem;
  const moveNavUnderline = (item) => {
    if (!item) return;
    lastNavItem = item;
    underline.style.opacity = '1';
    underline.style.left = `${item.offsetLeft}px`;
    underline.style.width = `${item.offsetWidth}px`;
  };
  navItems.forEach((item) => {
    item.addEventListener('mouseenter', () => moveNavUnderline(item));
    item.addEventListener('focus', () => moveNavUnderline(item));
  });
  navUnderlineHost.addEventListener('mouseleave', () => moveNavUnderline(activeNavItem));
  navUnderlineHost.addEventListener('focusout', (event) => {
    if (!navUnderlineHost.contains(event.relatedTarget)) moveNavUnderline(activeNavItem);
  });
  window.addEventListener('resize', () => moveNavUnderline(lastNavItem), { passive: true });
  window.requestAnimationFrame(() => moveNavUnderline(activeNavItem));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveNavUnderline(lastNavItem));
}

menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  if (link.id === 'hunter-about-trigger' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  navLinks.classList.remove('open');
}));

const postList = document.querySelector('.post-list');
const categoryFilter = document.querySelector('.category-filter');

// 以后有新分类在这里加一行；数组里的文字必须和文章卡片原分类一致。
const categoryMap = {
  生活: ['电脑与数码', '高考后记', '学校生活'],
  学习: ['前端', '俄语学习', '吐槽'],
  娱乐: ['阅读', '随笔', '游戏']
};

// 兼容当前文章里已经使用过的旧分类名，新增分类优先直接补到上面的配置表。
const legacyCategoryMap = { 学习: '学习', 俄语: '俄语学习', 疑惑: '前端' };
const groupOrder = Object.keys(categoryMap);
const postCards = postList ? [...postList.children].filter(item => item.matches('.post-card')) : [];

function parsePostDate(card) {
  const raw = card.dataset.date || card.querySelector('.post-meta span')?.textContent.trim() || '';
  const normalized = raw.replace(/[./]/g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    card.dataset.date = normalized;
    return normalized;
  }
  return '0000-00-00';
}

function resolvePostGroup(card) {
  const visibleCategory = card.querySelector('.post-meta span:nth-child(2)')?.textContent || '';
  const originalCategory = (visibleCategory || card.dataset.category || '').trim();
  card.dataset.category = originalCategory;
  const directGroup = groupOrder.find(group => categoryMap[group].includes(originalCategory));
  return directGroup || legacyCategoryMap[originalCategory] || '娱乐';
}

function seededArticleOffset(index) {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  const normalized = value - Math.floor(value);
  const magnitude = 8 + normalized * 16;
  return (index % 2 === 0 ? -1 : 1) * magnitude;
}

const postRecords = postCards.map((card, index) => {
  const group = resolvePostGroup(card);
  return {
    card,
    index,
    title: card.querySelector('h3')?.textContent.trim() || '',
    category: card.dataset.category || '',
    date: parsePostDate(card),
    group
  };
});
const groupElements = new Map();

if (postList) {
  postList.replaceChildren();
  groupOrder.forEach(groupName => {
    const group = document.createElement('section');
    group.className = 'post-group';
    group.dataset.group = groupName;
    group.setAttribute('aria-labelledby', `post-group-${groupName}`);

    const toggle = document.createElement('button');
    toggle.className = 'post-group__toggle';
    toggle.type = 'button';
    toggle.id = `post-group-${groupName}`;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span class="post-group__name"><span class="post-group__arrow" aria-hidden="true">▸</span>${groupName}</span><span class="post-group__count">${groupName} · 0</span>`;

    const items = document.createElement('div');
    items.className = 'post-group__items';
    items.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'post-group__items-inner';
    items.append(inner);
    group.append(toggle, items);
    postList.append(group);
    groupElements.set(groupName, { group, toggle, items, inner });
  });

  postRecords.sort((a, b) => b.date.localeCompare(a.date));
  postRecords.forEach(({ card, group, index }) => {
    const groupState = groupElements.get(group);
    if (!groupState) return;
    groupState.inner.append(card);
    card.style.setProperty('--article-offset', `${seededArticleOffset(index).toFixed(2)}px`);
  });

  groupElements.forEach(({ group, toggle, items, inner }, groupName) => {
    const count = inner.children.length;
    toggle.querySelector('.post-group__count').textContent = `${groupName} · ${count}`;
    toggle.addEventListener('click', () => {
      setGroupOpen(groupName, !group.classList.contains('is-open'));
    });
  });
}

const posts = postRecords.map(({ title, category }) => ({ title, category }));

function setGroupOpen(groupName, open) {
  const state = groupElements.get(groupName);
  if (!state) return;
  const { group, toggle, items, inner } = state;
  group.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  items.setAttribute('aria-hidden', String(!open));
  const arrow = toggle.querySelector('.post-group__arrow');
  if (arrow) arrow.textContent = open ? '▾' : '▸';
  const height = open ? `${inner.scrollHeight}px` : '0px';
  items.style.setProperty('--group-height', height);
  items.style.maxHeight = height;
}

function setCategoryFilter(filter) {
  categoryFilter?.querySelectorAll('.category-filter__item').forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (filter === 'all') {
    // 全部：隐藏分组标题，所有文章按时间倒序平铺成一条时间线。
    groupElements.forEach(({ group }) => {
      group.hidden = true;
    });
    postRecords
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(({ card }) => postList.append(card));
    return;
  }
  // 具体分类：所有卡片回到各自分组，只显示并展开选中的组。
  groupElements.forEach(({ inner }, groupName) => {
    postRecords
      .filter(record => record.group === groupName)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(({ card }) => inner.append(card));
  });
  groupElements.forEach(({ group }, groupName) => {
    const visible = groupName === filter;
    group.hidden = !visible;
    setGroupOpen(groupName, visible);
  });
}

// 初始状态：默认打开"全部"，全部文章按时间排序直接展示。
setCategoryFilter('all');
categoryFilter?.querySelectorAll('.category-filter__item').forEach(button => {
  button.addEventListener('click', () => setCategoryFilter(button.dataset.filter));
});

window.addEventListener('resize', () => {
  groupElements.forEach(({ group, items, inner }) => {
    if (!group.classList.contains('is-open')) return;
    const height = `${inner.scrollHeight}px`;
    items.style.setProperty('--group-height', height);
    items.style.maxHeight = height;
  });
});
function closeSearch() { searchOverlay.classList.remove('open'); searchOverlay.setAttribute('aria-hidden', 'true'); body.classList.remove('no-scroll'); }
function openSearch() { searchOverlay.classList.add('open'); searchOverlay.setAttribute('aria-hidden', 'false'); body.classList.add('no-scroll'); setTimeout(() => searchInput.focus(), 120); }
searchToggle.addEventListener('click', openSearch);
searchClose.addEventListener('click', closeSearch);
searchOverlay.addEventListener('click', event => { if (event.target === searchOverlay) closeSearch(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented) {
    closeSearch();
  }
});
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  const matches = query ? posts.filter(post => `${post.title}${post.category}`.toLowerCase().includes(query)) : [];
  searchResults.innerHTML = matches.length
    ? matches.map(post => `<a class="result-item" href="#posts"><span>${post.category}</span>${post.title}</a>`).join('')
    : (query ? '<p>没有找到匹配的文章，换个关键词试试。</p>' : '<p>输入关键词开始搜索。</p>');
});

newsletterForm.addEventListener('submit', event => {
  event.preventDefault();
  formNote.textContent = '已收到，下一封信见。';
  newsletterForm.querySelector('input').value = '';
});

document.querySelector('#load-more').addEventListener('click', event => {
  event.currentTarget.innerHTML = '已经到底啦 <span>✦</span>';
  event.currentTarget.disabled = true;
});

document.querySelectorAll('.expand-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const postCopy = document.querySelector(`#${toggle.getAttribute('aria-controls')}`);
    const extra = postCopy?.querySelector('.post-extra');
    if (!extra) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    extra.hidden = expanded;
    toggle.innerHTML = expanded ? '展开 <span>↓</span>' : '收起 <span>↑</span>';
    const group = toggle.closest('.post-group');
    const groupName = group?.dataset.group;
    if (groupName && group.classList.contains('is-open')) {
      requestAnimationFrame(() => setGroupOpen(groupName, true));
    }
  });
});

// 留言板会随纸条数量增高，避免滚动显现阈值导致长留言板无法显示。
const revealItems = document.querySelectorAll('.section-heading, .post-card, .sidebar > :not(.cat-guestbook), .newsletter-section, .site-footer');
revealItems.forEach((item, index) => {
  item.classList.add('reveal-item');
  item.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
});

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        entry.target.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
}

const lowerSection = document.querySelector('.layout-section');
if (lowerSection) {
  const lowerBackgrounds = [
    'assets/lower-bg-1.jpg',
    'assets/lower-bg-2.jpg',
    'assets/lower-bg-4.jpg',
    'assets/lower-bg-6.jpg',
    'assets/lower-bg-rise-palico-1.png',
    'assets/lower-bg-rise-palico-2.png'
  ];
  const secretBackground = 'assets/lower-bg-secret.jpg';
  let lowerBackgroundIndex = 0;
  let normalAppearances = 1;
  lowerSection.style.setProperty('--lower-bg-current', `url('${lowerBackgrounds[0]}')`);
  lowerSection.style.setProperty('--lower-bg-next', `url('${lowerBackgrounds[1]}')`);

  const fadeToBackground = (background, done) => {
    lowerSection.style.setProperty('--lower-bg-next', `url('${background}')`);
    lowerSection.classList.add('bg-changing');
    window.setTimeout(() => {
      lowerSection.style.setProperty('--lower-bg-current', `url('${background}')`);
      lowerSection.classList.remove('bg-changing');
      if (done) done();
    }, 1000);
  };

  const scheduleBackground = () => window.setTimeout(() => {
    if (normalAppearances >= 73) {
      fadeToBackground(secretBackground, () => {
        window.setTimeout(() => {
          lowerBackgroundIndex = (lowerBackgroundIndex + 1) % lowerBackgrounds.length;
          fadeToBackground(lowerBackgrounds[lowerBackgroundIndex], () => {
            normalAppearances = 1;
            scheduleBackground();
          });
        }, 5000);
      });
      return;
    }

    lowerBackgroundIndex = (lowerBackgroundIndex + 1) % lowerBackgrounds.length;
    normalAppearances += 1;
    fadeToBackground(lowerBackgrounds[lowerBackgroundIndex], scheduleBackground);
  }, 7000);

  scheduleBackground();
}

// 音乐播放器已拆到公共文件 music-player.js：所有页面共用同一份播放与接力逻辑。
// 波浪渲染器通常由 music-waves.js 提供；这里保留无独立脚本时的兼容实现。
const musicAudio = document.querySelector('#music-audio');

if (!window.__musicWavesLoaded) {
// 双侧透明波浪：一个 Canvas 绘制全部层，数据源接入现有自建 <audio>。
const musicWaveCanvas = document.querySelector('#music-waves');
const musicWaveContext = musicWaveCanvas?.getContext('2d');
const musicWaveReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const musicWaveColors = ['#3E8EF7', '#6FD6FF', '#BFF0FF', '#FFFFFF'];
const musicWaveTau = Math.PI * 2;
const musicWaveSqrtTwo = Math.SQRT2;
const musicWaveSqrtThree = Math.sqrt(3);
let musicWaveWidth = 0;
let musicWaveHeight = 0;
let musicWaveDpr = 1;
let musicWaveLayers = [];
let musicWaveFrame = 0;
let musicWavePlaying = false;
let musicWaveVisible = !document.hidden;
let musicWaveLastTime = 0;
let musicWaveOpacity = 0.12;
let musicWaveAudioContext;
let musicWaveSource;
let musicWaveAnalyser;
let musicWaveFrequencyData;
let musicWaveLowEnergy = 0.04;
let musicWaveHighEnergy = 0.04;

function musicWaveClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function musicWaveHash(value, seed) {
  const input = Math.sin(value * 127.1 + seed * 311.7) * 43758.5453;
  return input - Math.floor(input);
}

function musicWaveNoise(value, seed) {
  const left = Math.floor(value);
  const fraction = value - left;
  const smooth = fraction * fraction * (3 - 2 * fraction);
  const a = musicWaveHash(left, seed);
  const b = musicWaveHash(left + 1, seed);
  return (a + (b - a) * smooth) * 2 - 1;
}

function createMusicWaveLayer(side, index, layerCount) {
  const mobile = musicWaveWidth < 768;
  const depth = layerCount <= 1 ? 0 : index / (layerCount - 1);
  const amplitude = [28, 16, 35, 22][index] * (mobile ? 0.52 : 1);
  const alpha = [0.44, 0.3, 0.19, 0.11][index];
  return {
    side,
    base: (mobile ? 6 : 8) + index * (mobile ? 18 : 17),
    amplitude,
    wavelength: [104, 173, 247, 137][index],
    speed: [0.78, 1.12, 0.56, 0.94][index],
    direction: index === 1 || (side === 'right' && index === 3) ? -1 : 1,
    phase: Math.random() * musicWaveTau,
    noiseSeed: Math.random() * 1000 + index * 17,
    alpha,
    color: musicWaveColors[index],
    depth,
    offset: Math.random() * 1000
  };
}

function rebuildMusicWaveLayers() {
  const layerCount = musicWaveWidth < 768 ? 2 : 4;
  musicWaveLayers = [];
  ['left', 'right'].forEach(side => {
    for (let index = 0; index < layerCount; index += 1) {
      musicWaveLayers.push(createMusicWaveLayer(side, index, layerCount));
    }
  });
}

function resizeMusicWaveCanvas() {
  if (!musicWaveCanvas || !musicWaveContext) return;
  musicWaveWidth = window.innerWidth;
  musicWaveHeight = window.innerHeight;
  musicWaveDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  musicWaveCanvas.width = Math.round(musicWaveWidth * musicWaveDpr);
  musicWaveCanvas.height = Math.round(musicWaveHeight * musicWaveDpr);
  musicWaveCanvas.style.width = `${musicWaveWidth}px`;
  musicWaveCanvas.style.height = `${musicWaveHeight}px`;
  musicWaveContext.setTransform(musicWaveDpr, 0, 0, musicWaveDpr, 0, 0);
  rebuildMusicWaveLayers();
  if (!musicWavePlaying || musicWaveReducedMotion.matches) drawMusicWaves(performance.now());
}

function ensureMusicWaveAnalyser() {
  if (!musicAudio || musicWaveAnalyser) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    musicWaveAudioContext = new AudioContextClass();
    if (musicWaveAudioContext.state === 'suspended') void musicWaveAudioContext.resume().catch(() => {});
    musicWaveSource = musicWaveAudioContext.createMediaElementSource(musicAudio);
    musicWaveAnalyser = musicWaveAudioContext.createAnalyser();
    musicWaveAnalyser.fftSize = 128;
    musicWaveAnalyser.smoothingTimeConstant = 0.82;
    musicWaveFrequencyData = new Uint8Array(musicWaveAnalyser.frequencyBinCount);
    musicWaveSource.connect(musicWaveAnalyser);
    musicWaveAnalyser.connect(musicWaveAudioContext.destination);
  } catch {
    try {
      musicWaveSource?.disconnect();
      if (musicWaveSource && musicWaveAudioContext) musicWaveSource.connect(musicWaveAudioContext.destination);
    } catch {}
    musicWaveAudioContext = undefined;
    musicWaveSource = undefined;
    musicWaveAnalyser = undefined;
    musicWaveFrequencyData = undefined;
  }
}

function wakeMusicWaveAudioContext() {
  ensureMusicWaveAnalyser();
  if (musicWaveAudioContext?.state === 'suspended') void musicWaveAudioContext.resume().catch(() => {});
}

function sampleMusicWaveAudio(deltaMs, now) {
  let lowTarget = musicWavePlaying ? 0.22 + Math.sin(now * 0.0017) * 0.08 : 0.02;
  let highTarget = musicWavePlaying ? 0.2 + Math.sin(now * 0.0023 + 1.7) * 0.1 : 0.02;
  if (musicWaveAnalyser && musicWaveFrequencyData && musicWavePlaying) {
    musicWaveAnalyser.getByteFrequencyData(musicWaveFrequencyData);
    const lowEnd = Math.max(1, Math.floor(musicWaveFrequencyData.length * 0.2));
    const highStart = Math.floor(musicWaveFrequencyData.length * 0.36);
    let lowSum = 0;
    let highSum = 0;
    for (let index = 0; index < musicWaveFrequencyData.length; index += 1) {
      if (index < lowEnd) lowSum += musicWaveFrequencyData[index];
      if (index >= highStart) highSum += musicWaveFrequencyData[index];
    }
    lowTarget = lowSum / (lowEnd * 255);
    highTarget = highSum / (Math.max(1, musicWaveFrequencyData.length - highStart) * 255);
  }
  const smoothing = 1 - Math.exp(-Math.max(1, deltaMs) / 160);
  musicWaveLowEnergy += (lowTarget - musicWaveLowEnergy) * smoothing;
  musicWaveHighEnergy += (highTarget - musicWaveHighEnergy) * smoothing;
  if (musicWaveAudioContext?.state === 'suspended' && musicWavePlaying) void musicWaveAudioContext.resume().catch(() => {});
}

function musicWaveX(layer, y, now, amplitudeScale) {
  const travel = now * 0.05 * layer.speed * (0.42 + musicWaveHighEnergy * 1.55) * layer.direction;
  const shiftedY = y + travel + layer.offset;
  const angle = shiftedY / layer.wavelength * musicWaveTau;
  const displacement = layer.amplitude * amplitudeScale * (
    0.52 * Math.sin(angle + layer.phase) +
    0.29 * Math.sin(angle * musicWaveSqrtTwo + layer.phase * 1.73) +
    0.19 * Math.sin(angle * musicWaveSqrtThree - layer.phase * 0.61) +
    0.2 * musicWaveNoise(shiftedY / (layer.wavelength * 0.74), layer.noiseSeed)
  );
  const edgeInset = Math.max(2, Math.min(100, layer.base + displacement));
  return layer.side === 'left' ? edgeInset : musicWaveWidth - edgeInset;
}

function musicWaveRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawMusicWaveLayer(layer, now, amplitudeScale, opacityScale) {
  const ctx = musicWaveContext;
  const step = musicWaveWidth < 768 ? 12 : 8;
  const points = [];
  for (let y = -step; y <= musicWaveHeight + step; y += step) {
    points.push([musicWaveX(layer, y, now, amplitudeScale), y]);
  }
  const edgeX = layer.side === 'left' ? 0 : musicWaveWidth;
  const gradient = ctx.createLinearGradient(edgeX, 0, points[0][0], 0);
  const layerAlpha = layer.alpha * opacityScale;
  if (layer.side === 'left') {
    gradient.addColorStop(0, musicWaveRgba(layer.color, 0));
    gradient.addColorStop(1, musicWaveRgba(layer.color, layerAlpha));
  } else {
    gradient.addColorStop(0, musicWaveRgba(layer.color, layerAlpha));
    gradient.addColorStop(1, musicWaveRgba(layer.color, 0));
  }
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(edgeX, musicWaveHeight);
  ctx.lineTo(edgeX, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.strokeStyle = musicWaveRgba(layer.color, Math.min(0.3, layerAlpha * 0.72));
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMusicWaves(now = performance.now()) {
  if (!musicWaveContext || !musicWaveWidth || !musicWaveHeight) return;
  const deltaMs = musicWaveLastTime ? now - musicWaveLastTime : 16;
  musicWaveLastTime = now;
  sampleMusicWaveAudio(deltaMs, now);
  musicWaveOpacity += ((musicWavePlaying ? 1 : 0.16) - musicWaveOpacity) * (1 - Math.exp(-Math.max(1, deltaMs) / 260));
  musicWaveContext.clearRect(0, 0, musicWaveWidth, musicWaveHeight);
  if (musicWaveReducedMotion.matches) {
    musicWaveLayers.filter(layer => layer.depth === 1).forEach(layer => drawMusicWaveLayer(layer, 0, 0.2, 0.42));
    return;
  }
  const amplitudeScale = musicWavePlaying ? 0.74 + musicWaveLowEnergy * 1.15 : 0.08;
  musicWaveLayers.forEach(layer => drawMusicWaveLayer(layer, now, amplitudeScale, musicWaveOpacity));
}

function stopMusicWaveFrame() {
  if (!musicWaveFrame) return;
  cancelAnimationFrame(musicWaveFrame);
  musicWaveFrame = 0;
}

function animateMusicWaves(now) {
  musicWaveFrame = 0;
  if (!musicWaveVisible) return;
  drawMusicWaves(now);
  if (musicWavePlaying || musicWaveOpacity > 0.18) musicWaveFrame = requestAnimationFrame(animateMusicWaves);
}

function startMusicWaveFrame() {
  if (!musicWaveVisible || musicWaveReducedMotion.matches || musicWaveFrame) return;
  musicWaveFrame = requestAnimationFrame(animateMusicWaves);
}

function setMusicWavesPlaying(playing) {
  musicWavePlaying = Boolean(playing);
  if (musicWavePlaying) {
    ensureMusicWaveAnalyser();
    startMusicWaveFrame();
  } else if (!musicWaveReducedMotion.matches && musicWaveVisible) {
    startMusicWaveFrame();
  } else {
    stopMusicWaveFrame();
    drawMusicWaves(performance.now());
  }
}

// 保留旧版独立联动入口，并提供语义更清晰的新入口。
window.setMusicMetersPlaying = setMusicWavesPlaying;
window.setMusicWavesPlaying = setMusicWavesPlaying;

if (musicWaveCanvas && musicWaveContext) {
  resizeMusicWaveCanvas();
  window.addEventListener('resize', resizeMusicWaveCanvas, { passive: true });
  ['music-play', 'music-prev', 'music-next'].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener('pointerdown', wakeMusicWaveAudioContext, { passive: true });
  });
  musicAudio?.addEventListener('play', () => setMusicWavesPlaying(true));
  musicAudio?.addEventListener('pause', () => setMusicWavesPlaying(false));
  musicAudio?.addEventListener('ended', () => setMusicWavesPlaying(false));
  musicWaveReducedMotion.addEventListener?.('change', () => {
    stopMusicWaveFrame();
    drawMusicWaves(performance.now());
    if (musicWavePlaying && !musicWaveReducedMotion.matches) startMusicWaveFrame();
  });
  document.addEventListener('visibilitychange', () => {
    musicWaveVisible = !document.hidden;
    if (!musicWaveVisible) {
      stopMusicWaveFrame();
      return;
    }
    musicWaveLastTime = performance.now();
    drawMusicWaves(musicWaveLastTime);
    if (musicWavePlaying && !musicWaveReducedMotion.matches) startMusicWaveFrame();
  });
  // 播放器可能在本脚本之前已经恢复播放（跨页接力），先对齐一次状态。
  setMusicWavesPlaying(Boolean(musicAudio && !musicAudio.paused));
}
}


// 桌面悬停由 CSS 控制；JS 负责触屏点击、键盘退出和可用高度。
const hunterAbout = document.querySelector('#hunter-about');
const hunterTrigger = document.querySelector('#hunter-about-trigger');
const hunterCard = document.querySelector('#hunter-card');
const hunterHover = window.matchMedia('(hover: hover) and (pointer: fine)');
if (hunterAbout && hunterTrigger && hunterCard) {
  const fitHunterCard = () => {
    const top = hunterTrigger.getBoundingClientRect().bottom;
    hunterCard.style.setProperty('--hunter-card-room', `${Math.max(80, window.innerHeight - top - 16)}px`);
  };
  const closeHunterCard = () => {
    hunterAbout.classList.remove('is-open');
    hunterAbout.classList.add('is-dismissed');
    hunterTrigger.setAttribute('aria-expanded', 'false');
  };
  hunterAbout.addEventListener('mouseenter', () => {
    if (!hunterHover.matches) return;
    fitHunterCard();
    hunterAbout.classList.remove('is-dismissed');
    hunterTrigger.setAttribute('aria-expanded', 'true');
  });
  hunterAbout.addEventListener('mouseleave', () => {
    if (hunterHover.matches) closeHunterCard();
  });
  hunterTrigger.addEventListener('click', event => {
    if (hunterHover.matches) return; // 鼠标点击仍可跳转到原来的关于我栏目。
    event.preventDefault();
    const open = !hunterAbout.classList.contains('is-open');
    fitHunterCard();
    hunterAbout.classList.remove('is-dismissed');
    hunterAbout.classList.toggle('is-open', open);
    hunterTrigger.setAttribute('aria-expanded', String(open));
  });
  hunterTrigger.addEventListener('focus', () => {
    if (!hunterTrigger.matches(':focus-visible')) return;
    fitHunterCard();
    hunterAbout.classList.remove('is-dismissed');
    hunterAbout.classList.add('is-open');
    hunterTrigger.setAttribute('aria-expanded', 'true');
  });
  hunterAbout.addEventListener('focusout', event => {
    if (!hunterAbout.contains(event.relatedTarget)) closeHunterCard();
  });
  document.addEventListener('click', event => {
    if (!hunterAbout.contains(event.target)) closeHunterCard();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (hunterCard.contains(document.activeElement)) hunterTrigger.focus();
    closeHunterCard();
  });
  window.addEventListener('resize', fitHunterCard);
  hunterHover.addEventListener('change', closeHunterCard);
  fitHunterCard();
}

/* =========================================================================
   GitHub 插件：一言语录 + 灯箱 + 贡献日历（全部可优雅降级）
   ========================================================================= */

// 一言语录：每天打开页面随机一句，网络失败保留原文。
(function initHitokoto() {
  const quoteCard = document.querySelector('.quote-card');
  const quoteText = quoteCard && quoteCard.querySelector('p');
  const quoteAuthor = quoteCard && quoteCard.querySelector('.quote-author');
  if (!quoteText) return;
  fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k&c=l&encode=json')
    .then(response => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
    .then(data => {
      if (data && typeof data.hitokoto === 'string' && data.hitokoto.length <= 60) {
        quoteText.textContent = data.hitokoto;
        if (quoteAuthor) quoteAuthor.textContent = '— ' + (data.from || '一言');
      }
    })
    .catch(() => { /* 保留原文 */ });
})();

// GLightbox：目前用于头像大图；以后任何 <a class="glightbox" href="图片"> 自动生效。
if (window.GLightbox) {
  window.GLightbox({ selector: '.glightbox', openEffect: 'fade', closeEffect: 'fade' });
}

// GitHub 贡献日历：allorigins 代理拉取，8 秒内没画出 SVG 就提示失败。
(function initGitHubCalendar() {
  const calendarBox = document.querySelector('#github-calendar');
  if (!calendarBox) return;
  if (typeof window.GitHubCalendar !== 'function') {
    calendarBox.textContent = '贡献日历暂时加载不出来，刷新试试。';
    return;
  }
  try {
    window.GitHubCalendar('#github-calendar', 'lychee199star', {
      responsive: true,
      global_stats: true,
      summary_text: '在 GitHub 搬砖的日子',
      proxy: username => 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://github.com/users/' + username + '/contributions')
    });
  } catch (error) {
    calendarBox.textContent = '贡献日历暂时加载不出来，刷新试试。';
  }
  window.setTimeout(() => {
    if (!calendarBox.querySelector('svg')) {
      calendarBox.textContent = '贡献日历暂时加载不出来，刷新试试。';
    }
  }, 8000);
})();
