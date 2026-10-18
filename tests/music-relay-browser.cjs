// 跨页面音乐接力 / 圆角改动 的浏览器验证：
// 首页播放到 30 秒 → 跳友链页继续 → 暂停后跳回首页保持暂停 → 模拟浏览器拦截自动播放 → 兜底按钮续播。
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-music-'));
const artifacts = path.join(__dirname, 'artifacts');
const pause = ms => new Promise(r => setTimeout(r, ms));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg'};
let browser, socket;

// 支持 Range 的静态服务器：<audio> 跳进度时需要 206 响应，否则会整段重下。
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {res.writeHead(404).end(); return;}
    const type = mime[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      let start = range[1] ? Number(range[1]) : 0;
      let end = range[2] ? Number(range[2]) : stat.size - 1;
      if (!range[1] && range[2]) {start = Math.max(0, stat.size - Number(range[2])); end = stat.size - 1;}
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1,
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(file, {start, end}).pipe(res);
      return;
    }
    res.writeHead(200, {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size, 'Cache-Control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  });
});

(async () => {
  fs.mkdirSync(artifacts, {recursive: true});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--mute-audio','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'
  ], {windowsHide:true, stdio:'ignore'});
  let launchError;
  browser.on('error', error => {launchError=error;});
  const active = path.join(profile, 'DevToolsActivePort');
  for(let i=0;i<150 && !fs.existsSync(active);i++) {if(launchError) throw launchError; await pause(100);}
  assert(fs.existsSync(active), '浏览器调试端口未启动');
  const port=fs.readFileSync(active,'utf8').split('\n')[0];
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let serial=0; const pending=new Map(), errors=[];
  socket.onmessage=event=>{
    const data=JSON.parse(event.data);
    if(data.method==='Runtime.exceptionThrown') errors.push('exception: '+data.params.exceptionDetails.text);
    if(data.method==='Runtime.consoleAPICalled' && data.params.type==='error') errors.push('console.error: '+data.params.args.map(a=>a.value ?? a.description).join(' '));
    if(data.id && pending.has(data.id)) {
      const {resolve,reject}=pending.get(data.id); pending.delete(data.id);
      data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result);
    }
  };
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{
    const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const waitFor=async (expression, tries = 200) => {
    for(let i=0;i<tries;i++){if(await evaluate(expression)) return;await pause(50);}
    throw new Error('Timed out: '+expression);
  };
  const shot=async name=>{
    const png=await call('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(artifacts, name), Buffer.from(png.data,'base64'));
  };
  const readPlayer=`(() => {
    const a = document.querySelector('#music-audio');
    const seek = document.querySelector('#music-seek');
    const stored = JSON.parse(localStorage.getItem('blog-music-state-v1') || 'null');
    return {
      path: location.pathname,
      paused: a.paused,
      time: Math.round(a.currentTime * 100) / 100,
      duration: Math.round((a.duration || 0) * 100) / 100,
      readyState: a.readyState,
      title: document.querySelector('#music-title')?.textContent,
      status: document.querySelector('#music-status')?.textContent,
      playGlyph: document.querySelector('#music-play')?.textContent,
      seekValue: Number(seek?.value),
      seekFill: seek?.style.getPropertyValue('--music-progress'),
      resumeVisible: !!document.querySelector('#music-resume') && !document.querySelector('#music-resume').hidden,
      stored
    };
  })()`;

  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://cdn.staticfile.net/*']});
  const origin=`http://127.0.0.1:${server.address().port}`;
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:origin+'/index.html'});
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('#music-audio')`);
  await evaluate(`document.querySelector('#welcome-close')?.click()`);
  await waitFor(`document.querySelector('#music-audio').readyState >= 1`);
  await waitFor(`!document.querySelector('#music-audio').paused`);
  const start = await evaluate(readPlayer);
  assert.equal(start.title, '崛起｜英雄の証');
  assert(start.duration > 60, '音频时长异常：' + start.duration);
  assert.equal(start.playGlyph, 'Ⅱ', '自动播放后按钮应显示暂停');
  assert.equal(start.status, '播放中');

  // 1) 播放到 30 秒，等一次周期保存后跳到友链页。
  await evaluate(`document.querySelector('#music-audio').currentTime = 30`);
  await pause(3000);
  const beforeJump = await evaluate(readPlayer);
  assert(beforeJump.time >= 30.5, '没有从 30 秒继续播放');
  assert(beforeJump.stored && Math.abs(beforeJump.stored.time - beforeJump.time) < 2.6, '周期保存的进度落后太多');
  assert.equal(beforeJump.stored.playing, true);
  await evaluate(`document.querySelector('.nav-links a[href="friends.html"]').click()`);
  await waitFor(`location.pathname === '/friends.html' && document.readyState === 'complete'`);
  await waitFor(`document.querySelector('#music-audio')?.readyState >= 1`);
  await waitFor(`!document.querySelector('#music-audio')?.paused`, 300);
  await pause(120);
  const onFriends = await evaluate(readPlayer);
  assert.equal(onFriends.title, beforeJump.title, '友链页歌名不一致');
  assert(Math.abs(onFriends.time - beforeJump.time) <= 2, `友链页进度误差过大：${beforeJump.time} → ${onFriends.time}`);
  assert.equal(onFriends.playGlyph, 'Ⅱ', '友链页恢复播放后按钮应显示暂停');
  assert.equal(onFriends.status, '播放中');
  assert(onFriends.seekValue > 0 && onFriends.seekFill !== '0%', '友链页进度条没有恢复');
  const resumeTime = onFriends.time;
  await pause(1600);
  const stillPlaying = await evaluate(readPlayer);
  assert(stillPlaying.time > resumeTime + 1, '友链页没有继续前进');

  // 音量也要接力：调成 35% 后保存，下一页应恢复。
  await evaluate(`document.querySelector('#music-volume').value = '35'; document.querySelector('#music-volume').dispatchEvent(new Event('input', {bubbles: true}))`);
  await waitFor(`Math.abs(document.querySelector('#music-audio').volume - 0.35) < 0.01`);
  await pause(300);
  assert.equal((await evaluate(readPlayer)).stored.volume, 0.35, '调音量后没有立即保存');

  await shot('friends-player-desktop.png');
  await evaluate(`window.scrollTo(0, 0)`);
  await shot('friends-page-top.png');

  // 2) 暂停后跳回首页：恢复同一首与进度，但保持暂停。
  await evaluate(`document.querySelector('#music-play').click()`);
  await waitFor(`document.querySelector('#music-audio').paused`);
  const pausedOnFriends = await evaluate(readPlayer);
  assert.equal(pausedOnFriends.playGlyph, '▶');
  assert.equal(pausedOnFriends.status, '已暂停');
  await pause(300);
  await evaluate(`document.querySelector('.friends-nav-links a[href="index.html"]').click()`);
  await waitFor(`location.pathname === '/index.html' && document.readyState === 'complete'`);
  await waitFor(`document.querySelector('#music-audio')?.readyState >= 1`);
  await pause(800);
  const backHome = await evaluate(readPlayer);
  assert.equal(backHome.paused, true, '上一页是暂停，首页不应自动播放');
  assert.equal(backHome.title, pausedOnFriends.title);
  assert(Math.abs(backHome.time - pausedOnFriends.time) <= 2, `暂停恢复进度误差过大：${pausedOnFriends.time} → ${backHome.time}`);
  assert.equal(backHome.playGlyph, '▶', '暂停状态按钮不能显示成暂停键');
  assert.equal(backHome.status, '已暂停');
  assert(backHome.seekValue > 0, '暂停恢复后进度条应停在上次位置');
  assert(Math.abs((await evaluate(`document.querySelector('#music-audio').volume`)) - 0.35) < 0.02, '音量没有接力');
  assert.equal(await evaluate(`document.querySelector('#music-volume').value`), '35', '音量条没有同步恢复的音量');
  await evaluate(`document.querySelector('#welcome-close')?.click()`);

  // 3) 恢复播放后模拟浏览器拦截自动播放：右下角出现「点我继续听喵」。
  await evaluate(`document.querySelector('#music-play').click()`);
  await waitFor(`!document.querySelector('#music-audio').paused`);
  await evaluate(`document.querySelector('#music-audio').currentTime = 45`);
  await pause(3000);
  const beforeBlocked = await evaluate(readPlayer);
  assert(beforeBlocked.stored.playing === true);
  const injected = await call('Page.addScriptToEvaluateOnNewDocument', {source: `(() => {
    let gesture = false;
    const mark = () => { gesture = true; };
    document.addEventListener('pointerdown', mark, true);
    document.addEventListener('mousedown', mark, true);
    document.addEventListener('keydown', mark, true);
    document.addEventListener('touchstart', mark, true);
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!gesture) return Promise.reject(new DOMException('blocked by test', 'NotAllowedError'));
      return original.apply(this, arguments);
    };
  })();`});
  await evaluate(`document.querySelector('.nav-links a[href="friends.html"]').click()`);
  await waitFor(`location.pathname === '/friends.html' && document.readyState === 'complete'`);
  await waitFor(`!!document.querySelector('#music-resume') && !document.querySelector('#music-resume').hidden`, 300);
  const blocked = await evaluate(readPlayer);
  assert.equal(blocked.paused, true, '拦截时不应自行播放');
  assert.equal(blocked.status, '等待你点一下继续');
  assert.equal(await evaluate(`document.querySelector('#music-resume').textContent.trim()`), '点我继续听喵');
  await shot('friends-blocked.png');
  const box = await evaluate(`(() => { const r = document.querySelector('#music-resume').getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`);
  await call('Input.dispatchMouseEvent', {type:'mouseMoved', ...box});
  await call('Input.dispatchMouseEvent', {type:'mousePressed', button:'left', clickCount:1, ...box});
  await call('Input.dispatchMouseEvent', {type:'mouseReleased', button:'left', clickCount:1, ...box});
  await waitFor(`!document.querySelector('#music-audio').paused`, 200);
  await pause(150);
  const afterResumeClick = await evaluate(readPlayer);
  assert(Math.abs(afterResumeClick.time - beforeBlocked.time) <= 2.5, `兜底续播进度不对：${beforeBlocked.time} → ${afterResumeClick.time}`);
  assert.equal(afterResumeClick.resumeVisible, false, '点击后按钮应消失');
  assert.equal(afterResumeClick.status, '播放中');
  assert.equal(afterResumeClick.playGlyph, 'Ⅱ');
  await shot('friends-resume.png');
  await call('Page.removeScriptToEvaluateOnNewDocument', {identifier: injected.identifier});

  // 4) 回到首页：律动条跟随恢复后的播放状态。
  await evaluate(`document.querySelector('.friends-nav-links a[href="index.html"]').click()`);
  await waitFor(`location.pathname === '/index.html' && document.readyState === 'complete'`);
  await waitFor(`document.querySelector('#music-audio')?.readyState >= 1`);
  await waitFor(`!document.querySelector('#music-audio')?.paused`, 300);
  await pause(600);
  const meter = await evaluate(`({
    playing: document.querySelector('#music-meter-left').classList.contains('is-playing'),
    segmentsOn: document.querySelectorAll('#music-meter-left .music-meter__segment.is-on').length,
    bars: document.querySelectorAll('#music-meter-left .music-meter__bar').length
  })`);
  assert.equal(meter.playing, true, '律动条没有跟随恢复的播放状态');
  assert(meter.bars === 37 && meter.segmentsOn > 0);

  // 5) 圆角检查：各栏目圆角，告示板与友链保持原样。
  const radii = await evaluate(`(() => {
    const radius = selector => getComputedStyle(document.querySelector(selector)).borderTopLeftRadius;
    return {
      postCard: radius('.post-card'), profile: radius('.profile-card'), quote: radius('.quote-card'),
      sticker: radius('.sticker-card'), catNote: radius('.cat-note'), newsletter: radius('.newsletter-section'),
      search: radius('.search-dialog'), player: radius('.music-player'), guestbook: radius('.cat-guestbook'),
      guestbookSubmit: getComputedStyle(document.querySelector('.guestbook-submit')).borderTopLeftRadius
    };
  })()`);
  for (const key of ['postCard','profile','quote','sticker','catNote','newsletter','search','player']) {
    assert(parseFloat(radii[key]) >= 8, `${key} 没有圆角：${radii[key]}`);
  }
  assert.equal(radii.guestbook, '7px', '告示板圆角应保持原样');
  await evaluate(`document.querySelector('#welcome-close')?.click()`);
  await pause(600);
  await evaluate(`window.scrollTo(0, 0)`);
  await pause(300);
  await shot('index-top.png');
  await evaluate(`window.scrollTo(0, 900)`);
  await pause(500);
  await shot('index-posts.png');
  await evaluate(`document.querySelector('#cat-guestbook').scrollIntoView({block: 'start'})`);
  await pause(600);
  await shot('index-guestbook.png');
  await evaluate(`document.querySelector('.newsletter-section').scrollIntoView({block: 'center'})`);
  await pause(600);
  await shot('index-newsletter.png');

  // 手机尺寸：播放器不溢出，留声机默认收起成小木牌。
  await call('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:2,mobile:true});
  await evaluate(`window.scrollTo(0, 0)`);
  await pause(600);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false, '首页横向溢出');
  await shot('index-mobile.png');
  await evaluate(`location.href = '/friends.html'`);
  await waitFor(`location.pathname === '/friends.html' && document.readyState === 'complete'`);
  await waitFor(`!!document.querySelector('#music-audio')`);
  await pause(800);
  assert.equal(await evaluate(`document.querySelector('#music-player').classList.contains('is-collapsed')`), true, '手机上留声机应默认收起');
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false, '友链页横向溢出');
  await shot('friends-mobile.png');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    result: 'PASS',
    relay: {
      homeBeforeJump: beforeJump.time,
      friendsRestored: onFriends.time,
      drift: Math.round((onFriends.time - beforeJump.time) * 100) / 100,
      pausedFriends: pausedOnFriends.time,
      pausedHome: backHome.time,
      blockedAt: beforeBlocked.time,
      resumedAt: afterResumeClick.time
    },
    meter,
    radii
  }, null, 2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.closeAllConnections();server.close();});
