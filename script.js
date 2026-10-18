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

const catFaces = ['ฅ( ̳• ·̫ • ̳ฅ)', '(ฅ´ω`ฅ)', 'ฅ(＾・ω・＾ฅ)', '(=^･ω･^=)', 'ฅ(≚ᄌ≚)'];
if (catFace) {
  const previousCatFace = localStorage.getItem('blog-cat-face');
  const availableCatFaces = catFaces.filter(face => face !== previousCatFace);
  const nextCatFace = availableCatFaces[Math.floor(Math.random() * availableCatFaces.length)];
  catFace.textContent = nextCatFace;
  localStorage.setItem('blog-cat-face', nextCatFace);
}

window.addEventListener('scroll', () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${scrollable ? (window.scrollY / scrollable) * 100 : 0}%`;
}, { passive: true });

themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  themeToggle.textContent = body.classList.contains('dark') ? '☼' : '◐';
  localStorage.setItem('blog-theme', body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('blog-theme') === 'dark') { body.classList.add('dark'); themeToggle.textContent = '☼'; }

menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  if (link.id === 'hunter-about-trigger' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  navLinks.classList.remove('open');
}));

const posts = [...document.querySelectorAll('.post-card')].map(card => ({ title: card.querySelector('h3').textContent, category: card.dataset.category }));
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
// script.js 只保留页首的律动条，它跟着 <audio> 的 play / pause 事件走。
const musicAudio = document.querySelector('#music-audio');

// Retro segmented music meters driven by the existing <audio> element.
const musicMeterLeft = document.querySelector('#music-meter-left');
const musicMeterRight = document.querySelector('#music-meter-right');
const musicMeterBars = [];
const musicMeterReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let musicMeterAnimationFrame = 0;
let musicMetersPlaying = false;

function buildMusicMeters() {
  [musicMeterLeft, musicMeterRight].forEach(container => {
    if (!container) return;
    for (let index = 0; index < 37; index += 1) {
      const bar = document.createElement('span');
      bar.className = 'music-meter__bar';
      const segments = [];
      for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
        const segment = document.createElement('span');
        segment.className = 'music-meter__segment';
        bar.appendChild(segment);
        segments.push(segment);
      }
      const peak = document.createElement('span');
      peak.className = 'music-meter__peak';
      bar.appendChild(peak);
      container.appendChild(bar);
      musicMeterBars.push({ bar, segments, peak, current: 1, target: 1, peakLevel: 1, peakHoldUntil: 0, nextTargetAt: 0, side: container === musicMeterRight ? 'right' : 'left' });
    }
  });
}

function renderMusicMeter(state) {
  const activeSegments = Math.max(1, Math.min(10, Math.round(state.current)));
  state.segments.forEach((segment, index) => segment.classList.toggle('is-on', index < activeSegments));
  const peakIndex = Math.max(0, Math.min(9, Math.round(state.peakLevel) - 1));
  state.peak.classList.toggle('is-visible', musicMetersPlaying && !musicMeterReducedMotion.matches && state.peakLevel > 1.1);
  if (state.side === 'right') {
    state.peak.style.left = 'auto';
    state.peak.style.right = `${peakIndex * 8}px`;
  } else {
    state.peak.style.right = 'auto';
    state.peak.style.left = `${peakIndex * 8}px`;
  }
}

function resetMusicMeters() {
  musicMetersPlaying = false;
  [musicMeterLeft, musicMeterRight].forEach(container => container?.classList.remove('is-playing'));
  [musicMeterLeft, musicMeterRight].forEach(container => container?.classList.add('is-paused'));
  musicMeterBars.forEach(state => {
    state.current = 1;
    state.target = 1;
    state.peakLevel = 1;
    renderMusicMeter(state);
  });
  cancelAnimationFrame(musicMeterAnimationFrame);
}

function animateMusicMeters(now) {
  if (!musicMetersPlaying || musicMeterReducedMotion.matches) return;
  musicMeterBars.forEach(state => {
    if (now >= state.nextTargetAt) {
      state.target = 1 + Math.floor(Math.random() * 10);
      if (state.target > state.peakLevel) {
        state.peakLevel = state.target;
        state.peakHoldUntil = now + 300 + Math.random() * 200;
      }
      state.nextTargetAt = now + 100 + Math.random() * 50;
    }
    state.current += (state.target - state.current) * .18;
    if (now > state.peakHoldUntil) state.peakLevel = Math.max(state.current, state.peakLevel - .08);
    renderMusicMeter(state);
  });
  musicMeterAnimationFrame = requestAnimationFrame(animateMusicMeters);
}

function setMusicMetersPlaying(playing) {
  if (!playing || musicMeterReducedMotion.matches) {
    resetMusicMeters();
    return;
  }
  musicMetersPlaying = true;
  [musicMeterLeft, musicMeterRight].forEach(container => {
    container?.classList.add('is-playing');
    container?.classList.remove('is-paused');
  });
  const now = performance.now();
  musicMeterBars.forEach(state => { state.nextTargetAt = now + Math.random() * 140; });
  cancelAnimationFrame(musicMeterAnimationFrame);
  musicMeterAnimationFrame = requestAnimationFrame(animateMusicMeters);
}

if (musicMeterLeft || musicMeterRight) {
  buildMusicMeters();
  resetMusicMeters();
  musicAudio?.addEventListener('play', () => setMusicMetersPlaying(true));
  musicAudio?.addEventListener('pause', () => setMusicMetersPlaying(false));
  musicAudio?.addEventListener('ended', () => setMusicMetersPlaying(false));
  musicMeterReducedMotion.addEventListener?.('change', () => setMusicMetersPlaying(Boolean(musicAudio && !musicAudio.paused)));
  // 播放器可能在本脚本之前就已经恢复播放（跨页接力），先对齐一次状态。
  setMusicMetersPlaying(Boolean(musicAudio && !musicAudio.paused));
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
