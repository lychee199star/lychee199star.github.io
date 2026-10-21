(() => {
  'use strict';

  if (window.__musicWavesLoaded) return;
  window.__musicWavesLoaded = true;

  // 律动条：基于 wavesurfer.js（GitHub: katspaugh/wavesurfer.js，MIT）。
  // 左右两侧各一条竖置条形波形，随当前歌曲实时前进；切歌自动重新解码。
  const musicAudio = document.querySelector('#music-audio');
  if (!musicAudio || typeof window.WaveSurfer === 'undefined') return;

  // 友链页是木牌画风，用米黄色；主页用淡蓝。以后加页面在此处扩展色板。
  const isFriendsPage = document.body.classList.contains('friends-page');
  const palette = isFriendsPage
    ? { wave: 'rgba(242, 228, 192, 0.16)', progress: 'rgba(242, 228, 192, 0.9)' }
    : { wave: 'rgba(62, 142, 247, 0.18)', progress: 'rgba(111, 214, 255, 0.95)' };

  const strips = [];

  function createStrip(side) {
    const wrap = document.createElement('div');
    wrap.className = `wave-strip wave-strip--${side}`;
    wrap.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div');
    inner.className = 'wave-strip__inner';
    wrap.appendChild(inner);
    document.body.appendChild(wrap);

    let ws;
    try {
      ws = window.WaveSurfer.create({
        container: inner,
        height: 88,
        waveColor: palette.wave,
        progressColor: palette.progress,
        cursorWidth: 0,
        barWidth: 3,
        barGap: 3,
        barRadius: 3,
        barHeight: 1,
        interact: false,
        dragToSeek: false,
        backend: 'WebAudio',
        media: musicAudio
      });
    } catch (error) {
      wrap.remove();
      return null;
    }
    ws.on('error', () => wrap.remove());
    // 部分内置浏览器环境 ResizeObserver 不派发回调，画布创建依赖其首次回调：
    // ready 后手动触发一次重排，正常浏览器里该调用会被内部去重直接跳过。
    ws.on('ready', () => {
      try {
        if (typeof ws.renderer?.onContainerResize === 'function') ws.renderer.onContainerResize();
      } catch (error) { /* 忽略 */ }
    });
    return { wrap, ws };
  }

  ['left', 'right'].forEach((side) => {
    const strip = createStrip(side);
    if (strip) strips.push(strip);
  });
  if (!strips.length) return;

  // 初次创建已按 media 当前地址解码，记录后只在切歌时重载。
  let lastSrc = musicAudio.currentSrc || musicAudio.src || '';
  function syncTrack() {
    const src = musicAudio.currentSrc || musicAudio.src;
    if (!src || src === lastSrc) return;
    lastSrc = src;
    strips.forEach(({ ws }) => {
      try { ws.load(src); } catch (error) { /* 解码失败保持旧波形 */ }
    });
  }
  musicAudio.addEventListener('loadedmetadata', syncTrack);

  // 部分内置浏览器环境 ResizeObserver 不派发回调：窗口尺寸变化时手动触发重排。
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      strips.forEach(({ ws }) => {
        try { if (typeof ws.renderer?.onContainerResize === 'function') ws.renderer.onContainerResize(); } catch (error) { /* 忽略 */ }
      });
    }, 200);
  }, { passive: true });

  // 兼容旧接口：music-player 或其它脚本调用时不报错。
  window.setMusicWavesPlaying = function () {};
  window.setMusicMetersPlaying = window.setMusicWavesPlaying;
})();
