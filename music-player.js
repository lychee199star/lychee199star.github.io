/*!
 * 博客背景音乐播放器（跨页面接力）
 * ---------------------------------------------------------------------------
 * 纯原生 JS，不依赖任何第三方库。
 *
 * 页面之间靠 localStorage 传递"上一页的播放状态"：每页都放同一个播放器，
 * 上一页离开前把状态存好，新页面加载后读出来接着播。核心只有两个函数：
 *
 *   savePlayerState()    —— 把当前歌曲（src + 索引）、播放进度、音量、
 *                           "上次是播放中还是暂停"写进 localStorage。
 *   restorePlayerState() —— 读出这份状态，让播放器加载同一首歌、跳到保存
 *                           的秒数；上次是播放中就尝试继续播放，上次是暂停
 *                           就只恢复歌曲与进度，不自动播放。
 *
 * 【换播放器时怎么改】
 * 只需要改这两个函数的内部实现（外加 loadMusic/音量那几行的映射）：
 *   - 换成 APlayer：在 savePlayerState 里读 aplayer.audio.currentTime /
 *     aplayer.list.index；在 restorePlayerState 里用 aplayer.list.switch()
 *     选曲、aplayer.seek() 跳秒、aplayer.play()/pause() 控制。
 *   - 换成别的 <audio>/<video>：把文件里的 audio 变量换成新的媒体元素即可。
 * 进度条、播放/暂停按钮、右下角「点我继续听喵」兜底按钮都不用改。
 * ---------------------------------------------------------------------------
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- 配置
  const STORAGE_KEY = 'blog-music-state-v1'; // 接力状态；改名即可丢弃旧状态
  const MODE_KEY = 'blog-music-mode'; // 沿用首页原有的播放模式键
  const SAVE_INTERVAL = 2500; // 播放期间每 2.5 秒静默保存一次
  const SEEK_STEPS = 1000; // 进度条内部精度
  const RESUME_LABEL = '点我继续听喵'; // 艾露猫口吻，按需求保留原文
  const MODES = ['sequential', 'loop', 'random'];

  // 歌单：加歌只改这里，页面不用动。
  const PLAYLIST = [
    { title: '崛起｜英雄の証', src: 'assets/audio/hero-proof.mp3' },
    { title: '崛起｜カムラ祓え歌', src: 'assets/audio/kamura-village.mp3' },
    { title: '崛起｜Brave Hunters', src: 'assets/audio/rise-brave-hunters.mp3' },
    { title: '崛起｜深い森の幻影', src: 'assets/audio/monster-hunter-rise-theme.mp3' },
    { title: '世界｜星に駆られて', src: 'assets/audio/world-stars-at-our-backs.mp3' },
    { title: '世界｜英雄の証', src: 'assets/audio/world-hero-proof.mp3' },
    { title: '世界｜瘴気の谷', src: 'assets/audio/world-rotten-vale.mp3' },
    { title: '荒野｜廻りの唄', src: 'assets/audio/wilds-meguri-no-uta.mp3' },
    { title: '荒野｜風吹き山は遠きにありて', src: 'assets/audio/wilds-kazefuki-yama.mp3' }
  ];

  // ---------------------------------------------------------------- DOM
  const player = document.querySelector('#music-player');
  const audio = document.querySelector('#music-audio');
  // 没有播放器的页面（例如只引了脚本的旧页面）直接退出，不报错。
  if (!player || !audio) return;

  const $ = selector => document.querySelector(selector);
  const titleEl = $('#music-title');
  const statusEl = $('#music-status');
  const playButton = $('#music-play');
  const prevButton = $('#music-prev');
  const nextButton = $('#music-next');
  const modeSelect = $('#music-mode');
  const playlistEl = $('#music-playlist');
  const collapseButton = $('#music-collapse');
  const seekInput = $('#music-seek');
  const currentEl = $('#music-current');
  const durationEl = $('#music-duration');
  const volumeInput = $('#music-volume');

  // ---------------------------------------------------------------- 状态
  let index = 0;
  let mode = 'sequential';
  let intendedPlaying = false; // 用户意图：true = 上次/现在应是播放中
  let seeking = false; // 正在拖动进度条
  let restoring = false; // 恢复过程中不要覆盖旧状态
  let resumeButton = null;
  let saveTimer = 0;

  // ---------------------------------------------------------------- 小工具
  function normalizeIndex(value) {
    const length = PLAYLIST.length;
    return ((Math.trunc(value) % length) + length) % length;
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const total = Math.floor(value);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function setMusicStatus(message, isError = false) {
    if (statusEl) statusEl.textContent = message;
    player.classList.toggle('is-error', isError);
  }

  function setSliderFill(input, percent) {
    if (!input) return;
    input.style.setProperty('--music-progress', `${Math.min(100, Math.max(0, percent))}%`);
  }

  function isAutoplayBlocked(error) {
    // 浏览器拦截带声音的自动播放时，play() 的 Promise 会以 NotAllowedError 拒绝。
    return Boolean(error) && error.name === 'NotAllowedError';
  }

  // ---------------------------------------------------------------- 播放器 UI
  function renderPlaylist() {
    if (!playlistEl) return;
    playlistEl.innerHTML = PLAYLIST.map((track, trackIndex) => `<button class="music-track${trackIndex === index ? ' is-active' : ''}" type="button" data-track-index="${trackIndex}">${track.title}</button>`).join('');
    playlistEl.querySelectorAll('.music-track').forEach(button => {
      button.addEventListener('click', () => loadMusic(Number(button.dataset.trackIndex), true));
    });
  }

  function renderProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    if (seekInput && !seeking) {
      const fraction = duration > 0 ? Math.min(1, current / duration) : 0;
      seekInput.value = String(Math.round(fraction * SEEK_STEPS));
      seekInput.setAttribute('aria-valuetext', `${formatTime(current)} / ${formatTime(duration)}`);
      setSliderFill(seekInput, fraction * 100);
    }
    if (currentEl) currentEl.textContent = formatTime(current);
    if (durationEl) durationEl.textContent = formatTime(duration);
  }

  function updateMusicControls() {
    const playing = !audio.paused && !audio.ended;
    if (playButton) {
      playButton.textContent = playing ? 'Ⅱ' : '▶';
      playButton.setAttribute('aria-label', playing ? '暂停' : '播放');
    }
    player.classList.toggle('is-playing', playing);
    renderProgress();
  }

  function updateVolumeUI() {
    if (!volumeInput) return;
    const value = audio.muted ? 0 : Math.round((Number.isFinite(audio.volume) ? audio.volume : 1) * 100);
    volumeInput.value = String(value);
    setSliderFill(volumeInput, value);
  }

  function updateCollapsed(collapsed) {
    player.classList.toggle('is-collapsed', collapsed);
    if (!collapseButton) return;
    collapseButton.textContent = collapsed ? '+' : '−';
    collapseButton.setAttribute('aria-expanded', String(!collapsed));
    collapseButton.setAttribute('aria-label', collapsed ? '展开音乐播放器' : '收起音乐播放器');
  }

  // ---------------------------------------------------------------- 选曲 / 播放
  function loadMusic(nextIndex, shouldPlay = false, persist = true) {
    const target = normalizeIndex(Number(nextIndex) || 0);
    const track = PLAYLIST[target];
    if (!track) return;
    index = target;
    if (titleEl) titleEl.textContent = track.title;
    audio.src = track.src;
    audio.load();
    renderPlaylist();
    renderProgress();
    // 切歌的瞬间也保存：刚跳到新歌就离开页面，回来时还是这首。
    if (persist) savePlayerState();
    if (shouldPlay) {
      void playMusic();
    } else {
      setMusicStatus('准备播放');
      updateMusicControls();
    }
  }

  async function playMusic() {
    intendedPlaying = true;
    await startPlayback('正在加载…');
  }

  async function startPlayback(message = '正在加载…') {
    setMusicStatus(message);
    try {
      await audio.play();
      setMusicStatus('播放中');
      hideResumeButton();
    } catch (error) {
      if (isAutoplayBlocked(error)) {
        // 保留"本应播放"的意图，用户点一下就能接着播；跳到下一页还会再试一次。
        setMusicStatus('等待你点一下继续');
        showResumeButton();
      } else if (error && error.name === 'AbortError') {
        // 播放被切歌/暂停打断属于正常流程，不当作错误。
        updateMusicControls();
        return;
      } else {
        intendedPlaying = false;
        setMusicStatus('当前音频无法播放，请换用 MP3 文件', true);
      }
    }
    updateMusicControls();
  }

  function pauseMusic() {
    intendedPlaying = false;
    audio.pause();
    setMusicStatus(Number.isFinite(audio.currentTime) && audio.currentTime > 0 ? '已暂停' : '准备播放');
    updateMusicControls();
    hideResumeButton();
    savePlayerState();
  }

  function togglePlayback() {
    if (audio.paused || audio.ended) void playMusic();
    else pauseMusic();
  }

  function nextMusic() {
    if (mode === 'random' && PLAYLIST.length > 1) {
      let nextIndex = index;
      while (nextIndex === index) nextIndex = Math.floor(Math.random() * PLAYLIST.length);
      loadMusic(nextIndex, true);
      return;
    }
    loadMusic(index + 1, true);
  }

  function previousMusic() {
    loadMusic(index - 1, true);
  }

  function applyMode(value, persist = true) {
    if (!MODES.includes(value)) return;
    mode = value;
    if (modeSelect) modeSelect.value = value;
    if (persist) {
      try {
        localStorage.setItem(MODE_KEY, value);
      } catch {
        /* 存储受限时只影响下次打开，不影响本次播放。 */
      }
    }
  }

  function readMode() {
    try {
      return localStorage.getItem(MODE_KEY) || 'sequential';
    } catch {
      return 'sequential';
    }
  }

  // ---------------------------------------------------------------- 状态持久化
  /* =========================================================================
   * savePlayerState()：把"当前歌曲 / 进度 / 音量 / 播放中还是暂停"存起来。
   * 更换播放器（如 APlayer）时，只需改这个函数的取值来源。
   * ========================================================================= */
  function savePlayerState() {
    const track = PLAYLIST[index];
    if (!track) return;
    if (restoring) return; // 恢复途中别把还没读完的旧状态覆盖掉
    if (!audio.currentSrc && !audio.getAttribute('src')) return;
    const state = {
      v: 1,
      src: track.src, // 当前歌曲：优先用 src，换域名/目录也不用改索引逻辑
      index, // 同时存索引，src 对不上时兜底
      time: Math.round((Number.isFinite(audio.currentTime) ? audio.currentTime : 0) * 10) / 10,
      volume: Math.round((Number.isFinite(audio.volume) ? audio.volume : 1) * 100) / 100,
      playing: intendedPlaying, // 存"意图"而不是被浏览器拦下后的 paused
      mode,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 隐私模式或空间不足时静默失败，不影响播放。 */
    }
  }

  /* =========================================================================
   * restorePlayerState()：读回状态 —— 同一首歌、同一个秒数、同样的音量；
   * 上次是播放中就自动继续，上次是暂停就只恢复位置不自动播放。
   * 更换播放器（如 APlayer）时，只需改这个函数的恢复动作。
   * ========================================================================= */
  async function restorePlayerState() {
    restoring = true;
    try {
      const saved = readPlayerState();
      loadMusic(saved ? findTrackIndex(saved) : 0, false, false);

      if (saved) {
        const volume = Number(saved.volume);
        if (Number.isFinite(volume)) audio.volume = Math.min(1, Math.max(0, volume));
        if (saved.mode) applyMode(saved.mode, false);
      }
      updateVolumeUI();

      await waitForMetadata();

      if (saved) {
        seekTo(saved.time);
        intendedPlaying = Boolean(saved.playing);
      } else {
        // 没有历史状态：首页保持原来的"打开就播"，友链页不主动出声。
        intendedPlaying = player.dataset.autoplay === 'true';
      }
      renderProgress();
      updateMusicControls();

      if (!intendedPlaying) {
        setMusicStatus(saved && Number(saved.time) > 0 ? '已暂停' : '准备播放');
        return;
      }
      await startPlayback('接着上次继续播放…');
    } finally {
      restoring = false;
    }
  }

  function readPlayerState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!state || typeof state !== 'object' || state.v !== 1) return null;
      return state;
    } catch {
      return null;
    }
  }

  function findTrackIndex(state) {
    const bySrc = PLAYLIST.findIndex(track => track.src === state.src);
    if (bySrc >= 0) return bySrc;
    const byIndex = Number(state.index);
    if (Number.isInteger(byIndex) && byIndex >= 0 && byIndex < PLAYLIST.length) return byIndex;
    return 0;
  }

  function waitForMetadata() {
    if (audio.readyState >= 1) return Promise.resolve();
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        audio.removeEventListener('loadedmetadata', finish);
        audio.removeEventListener('error', finish);
        resolve();
      };
      const timer = setTimeout(finish, 8000);
      audio.addEventListener('loadedmetadata', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
    });
  }

  function seekTo(seconds) {
    const target = Number(seconds);
    if (!Number.isFinite(target) || target <= 0) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const clamped = duration > 0 ? Math.min(target, Math.max(0, duration - 0.5)) : target;
    try {
      audio.currentTime = clamped;
    } catch {
      /* 元数据没就绪时忽略，loadedmetadata 后会再同步一次进度条。 */
    }
  }

  // ---------------------------------------------------------------- 「点我继续听喵」兜底
  function ensureResumeButton() {
    if (resumeButton) return resumeButton;
    resumeButton = document.createElement('button');
    resumeButton.type = 'button';
    resumeButton.id = 'music-resume';
    resumeButton.className = 'music-resume notranslate';
    resumeButton.setAttribute('translate', 'no'); // 机翻不会改掉这句原文
    resumeButton.textContent = RESUME_LABEL;
    resumeButton.hidden = true;
    resumeButton.addEventListener('click', () => {
      hideResumeButton();
      void playMusic(); // 用户点击属于有效手势，浏览器会放行同一首歌的续播
    });
    document.body.append(resumeButton);
    return resumeButton;
  }

  function showResumeButton() {
    const button = ensureResumeButton();
    button.hidden = false;
    positionResumeButton();
  }

  function hideResumeButton() {
    if (resumeButton) resumeButton.hidden = true;
  }

  // 播放器占住右下角时（友链页的迷你留声机、矮窗口的首页），把按钮抬到它上方。
  function positionResumeButton() {
    if (!resumeButton || resumeButton.hidden) return;
    resumeButton.style.bottom = '';
    const buttonRect = resumeButton.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    const overlaps = buttonRect.left < playerRect.right
      && buttonRect.right > playerRect.left
      && buttonRect.top < playerRect.bottom
      && buttonRect.bottom > playerRect.top;
    if (!overlaps) return;
    resumeButton.style.bottom = `${Math.round(window.innerHeight - playerRect.top + 14)}px`;
  }

  // ---------------------------------------------------------------- 事件绑定
  function startAutoSave() {
    window.clearInterval(saveTimer);
    saveTimer = window.setInterval(() => {
      if (!audio.paused || intendedPlaying) savePlayerState();
    }, SAVE_INTERVAL);
  }

  function bindEvents() {
    playButton?.addEventListener('click', togglePlayback);
    prevButton?.addEventListener('click', previousMusic);
    nextButton?.addEventListener('click', nextMusic);

    modeSelect?.addEventListener('change', () => {
      applyMode(modeSelect.value);
      setMusicStatus(mode === 'random' ? '随机播放' : mode === 'loop' ? '循环播放' : '顺序播放');
      savePlayerState();
    });

    collapseButton?.addEventListener('click', () => updateCollapsed(!player.classList.contains('is-collapsed')));

    seekInput?.addEventListener('pointerdown', () => { seeking = true; });
    seekInput?.addEventListener('input', () => {
      seeking = true;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const fraction = Number(seekInput.value) / SEEK_STEPS;
      setSliderFill(seekInput, fraction * 100);
      if (duration > 0) {
        try {
          audio.currentTime = Math.min(fraction * duration, Math.max(0, duration - 0.15));
        } catch {
          /* 元数据未就绪时忽略。 */
        }
        if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
      }
    });
    seekInput?.addEventListener('change', () => {
      seeking = false;
      renderProgress();
      savePlayerState();
    });
    seekInput?.addEventListener('blur', () => { seeking = false; });

    volumeInput?.addEventListener('input', () => {
      const value = Math.min(100, Math.max(0, Number(volumeInput.value))) / 100;
      audio.volume = value;
      if (value > 0 && audio.muted) audio.muted = false;
      setSliderFill(volumeInput, value * 100);
    });
    volumeInput?.addEventListener('change', () => savePlayerState());

    audio.addEventListener('play', () => {
      setMusicStatus('播放中');
      hideResumeButton();
      updateMusicControls();
    });
    audio.addEventListener('pause', () => {
      if (audio.ended) return;
      if (!intendedPlaying && audio.readyState > 0) setMusicStatus('已暂停');
      updateMusicControls();
    });
    audio.addEventListener('timeupdate', () => {
      if (!seeking) renderProgress();
    });
    audio.addEventListener('loadedmetadata', renderProgress);
    audio.addEventListener('durationchange', renderProgress);
    audio.addEventListener('volumechange', () => {
      updateVolumeUI();
      savePlayerState(); // 调音量的瞬间保存
    });
    audio.addEventListener('seeked', savePlayerState);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src')) return;
      intendedPlaying = false;
      setMusicStatus('当前音频格式无法播放，请换用 MP3 文件', true);
      updateMusicControls();
    });

    // 离开页面时强制保存一次；移动端切后台/被冻结前也保存。
    window.addEventListener('pagehide', savePlayerState);
    window.addEventListener('beforeunload', savePlayerState);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) savePlayerState();
    });
    window.addEventListener('resize', positionResumeButton);
    window.addEventListener('pageshow', event => {
      // 浏览器"前进/后退"从缓存恢复页面时，媒体会被暂停，需要再续上。
      if (event.persisted && intendedPlaying && audio.paused) void startPlayback('接着上次继续播放…');
    });

    document.addEventListener('keydown', event => {
      if (event.defaultPrevented) return;
      if (document.querySelector('#welcome-overlay.open')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        previousMusic();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        nextMusic();
      } else if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      }
    });
  }

  function onEnded() {
    if (mode === 'loop') {
      loadMusic(index, true);
      return;
    }
    if (mode === 'random' || index < PLAYLIST.length - 1) {
      nextMusic();
      return;
    }
    intendedPlaying = false;
    setMusicStatus('歌单播放完毕');
    updateMusicControls();
    savePlayerState();
  }

  // ---------------------------------------------------------------- 启动
  applyMode(readMode(), false);
  updateVolumeUI();
  updateCollapsed(player.classList.contains('music-player--mini') && window.matchMedia('(max-width: 560px)').matches);
  renderPlaylist();
  bindEvents();
  startAutoSave();
  // 页面一加载就恢复；自动播放被拦截时会浮出「点我继续听喵」。
  void restorePlayerState();

  // 方便在控制台排查，也方便以后换播放器时手动调用。
  window.savePlayerState = savePlayerState;
  window.restorePlayerState = restorePlayerState;
})();
