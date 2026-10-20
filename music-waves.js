(() => {
  'use strict';

  if (window.__musicWavesLoaded) return;
  window.__musicWavesLoaded = true;

  const musicAudio = document.querySelector('#music-audio');
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
  let musicWaveAnalyserSetup;
  let musicWaveLowEnergy = 0.04;
  let musicWaveHighEnergy = 0.04;

  if (!musicWaveCanvas || !musicWaveContext) return;

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
    return {
      side,
      index,
      depth,
      base: (mobile ? 6 : 8) + index * (mobile ? 18 : 17),
      amplitude: [28, 16, 35, 22][index] * (mobile ? 0.52 : 1),
      wavelength: [104, 173, 247, 137][index],
      speed: [0.78, 1.12, 0.56, 0.94][index],
      direction: index === 1 || (side === 'right' && index === 3) ? -1 : 1,
      phase: Math.random() * musicWaveTau,
      noiseSeed: Math.random() * 1000 + index * 17,
      alpha: [0.44, 0.3, 0.19, 0.11][index],
      color: musicWaveColors[index],
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

  async function ensureMusicWaveAnalyser() {
    if (!musicAudio || musicWaveAnalyser) return musicWaveAnalyser;
    if (musicWaveAnalyserSetup) return musicWaveAnalyserSetup;

    musicWaveAnalyserSetup = (async () => {
      let context;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return undefined;
        context = new AudioContextClass();
        // 先恢复上下文，再创建 MediaElementSource；失败时不接管音频，保留原生直连声音。
        if (context.state === 'suspended') await context.resume();
        if (context.state !== 'running') throw new Error('AudioContext is not running');

        const source = context.createMediaElementSource(musicAudio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        source.connect(analyser);
        analyser.connect(context.destination);

        musicWaveAudioContext = context;
        musicWaveSource = source;
        musicWaveAnalyser = analyser;
        musicWaveFrequencyData = new Uint8Array(analyser.frequencyBinCount);
        return analyser;
      } catch {
        try { await context?.close(); } catch {}
        musicWaveAudioContext = undefined;
        musicWaveSource = undefined;
        musicWaveAnalyser = undefined;
        musicWaveFrequencyData = undefined;
        return undefined;
      } finally {
        musicWaveAnalyserSetup = undefined;
      }
    })();

    return musicWaveAnalyserSetup;
  }

  function wakeMusicWaveAudioContext() {
    void ensureMusicWaveAnalyser().then(() => {
      if (musicWaveAudioContext?.state === 'suspended') void musicWaveAudioContext.resume().catch(() => {});
    });
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
    const step = musicWaveWidth < 768 ? 12 : 8;
    const points = [];
    for (let y = -step; y <= musicWaveHeight + step; y += step) {
      points.push([musicWaveX(layer, y, now, amplitudeScale), y]);
    }
    const edgeX = layer.side === 'left' ? 0 : musicWaveWidth;
    const gradient = musicWaveContext.createLinearGradient(edgeX, 0, points[0][0], 0);
    const layerAlpha = layer.alpha * opacityScale;
    if (layer.side === 'left') {
      gradient.addColorStop(0, musicWaveRgba(layer.color, 0));
      gradient.addColorStop(1, musicWaveRgba(layer.color, layerAlpha));
    } else {
      gradient.addColorStop(0, musicWaveRgba(layer.color, layerAlpha));
      gradient.addColorStop(1, musicWaveRgba(layer.color, 0));
    }
    musicWaveContext.beginPath();
    musicWaveContext.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => musicWaveContext.lineTo(x, y));
    musicWaveContext.lineTo(edgeX, musicWaveHeight);
    musicWaveContext.lineTo(edgeX, 0);
    musicWaveContext.closePath();
    musicWaveContext.fillStyle = gradient;
    musicWaveContext.fill();
    musicWaveContext.beginPath();
    musicWaveContext.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => musicWaveContext.lineTo(x, y));
    musicWaveContext.strokeStyle = musicWaveRgba(layer.color, Math.min(0.3, layerAlpha * 0.72));
    musicWaveContext.lineWidth = 1;
    musicWaveContext.stroke();
  }

  function drawMusicWaves(now = performance.now()) {
    if (!musicWaveWidth || !musicWaveHeight) return;
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
      void ensureMusicWaveAnalyser();
      startMusicWaveFrame();
    } else if (!musicWaveReducedMotion.matches && musicWaveVisible) {
      startMusicWaveFrame();
    } else {
      stopMusicWaveFrame();
      drawMusicWaves(performance.now());
    }
  }

  // 兼容旧版独立联动入口，并提供语义更清晰的新入口。
  window.setMusicMetersPlaying = setMusicWavesPlaying;
  window.setMusicWavesPlaying = setMusicWavesPlaying;

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
})();
