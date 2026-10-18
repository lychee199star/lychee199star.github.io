// 独立临时浏览器验证，测试留言不会进入使用者的浏览器。
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-guestbook-'));
const pause = ms => new Promise(r => setTimeout(r, ms));
let browser, socket;
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg'};
  fs.readFile(file, (error, bytes) => {
    if (error) {res.writeHead(404).end(); return;}
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}).end(bytes);
  });
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--mute-audio','--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
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
    if(data.method==='Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
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
  const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression)) return;await pause(50);}throw new Error('Timed out: '+expression);};
  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html`});
  await waitFor(`document.querySelector('#guestbook-empty') && document.readyState === 'complete'`);
  await evaluate(`document.querySelector('#welcome-close').click(); document.querySelector('#music-audio').pause();`);
  assert(await evaluate(`document.querySelector('#cat-guestbook').previousElementSibling.classList.contains('sticker-card')`));
  assert.equal(await evaluate(`document.querySelector('#guestbook-empty').textContent`), '还没有猎人留言喵，来做第一个吧喵！');
  await evaluate(`document.querySelector('#guestbook-form').requestSubmit()`);
  assert.equal(await evaluate(`document.querySelector('#guestbook-status').textContent`), '什么都还没写喵，钉子都没处下喵！');
  await evaluate(`document.querySelector('#guestbook-message').value='青'.repeat(201); document.querySelector('#guestbook-message').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelector('#guestbook-message').value.length`),200);
  await evaluate(`document.querySelector('#guestbook-message').value='🐱'.repeat(201); document.querySelector('#guestbook-message').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`Array.from(document.querySelector('#guestbook-message').value).length`),200);
  await evaluate(`document.querySelector('#guestbook-message').value='<img src=x onerror="window.testXss=1">'; document.querySelector('#guestbook-form').requestSubmit()`);
  await waitFor(`document.querySelectorAll('.guestbook-paper').length === 1`);
  assert.equal(await evaluate(`document.querySelector('#guestbook-status').textContent`),'钉好了喵！本喵这就去汇报村长喵！');
  assert.equal(await evaluate(`document.querySelector('.guestbook-paper strong').textContent`),'无名猎人');
  assert.equal(await evaluate(`document.querySelectorAll('.guestbook-paper img').length`),0);
  assert.equal(await evaluate(`window.testXss || 0`),0);
  assert.match(await evaluate(`document.querySelector('.guestbook-paper time').textContent`),/^\d{1,2}月\d{1,2}日 \d{2}:\d{2}$/);
  await evaluate(`document.querySelector('#guestbook-message').value='太快了'; document.querySelector('#guestbook-form').requestSubmit()`);
  await waitFor(`document.querySelector('#guestbook-status').textContent.includes('秒后')`);
  assert.equal(await evaluate(`document.querySelectorAll('.guestbook-paper').length`),1);
  // reload 是异步的：先打标记，确认新文档已经接管后再继续，避免在旧文档上提交。
  await evaluate(`window.__guestbookReloadMark = 1`);
  await call('Page.reload');
  await waitFor(`window.__guestbookReloadMark === undefined && document.readyState === 'complete' && document.querySelectorAll('.guestbook-paper').length === 1`);
  await evaluate(`document.querySelector('#welcome-close').click(); document.querySelector('#music-audio').pause(); document.querySelector('#guestbook-message').value='刷新仍限流'; document.querySelector('#guestbook-form').requestSubmit()`);
  await waitFor(`document.querySelector('#guestbook-status').textContent.includes('秒后')`);
  // 仅调整隔离浏览器里的测试数据时间，验证下一条成功及最新排序。
  await evaluate(`var r=JSON.parse(localStorage.getItem('blog-cat-guestbook-v1')); r[0].createdAt-=11000; localStorage.setItem('blog-cat-guestbook-v1',JSON.stringify(r)); document.querySelector('#guestbook-name').value='<b>猎人</b>'; document.querySelector('#guestbook-message').value='今天也要吃饱猫饭喵！'; document.querySelector('#guestbook-form').requestSubmit()`);
  await waitFor(`document.querySelectorAll('.guestbook-paper').length === 2`);
  assert.equal(await evaluate(`document.querySelector('.guestbook-paper strong').textContent`),'<b>猎人</b>');
  assert.equal(await evaluate(`document.querySelectorAll('.guestbook-paper strong b').length`),0);
  // 写入失败不能清空输入、增加纸条或显示成功。
  await evaluate(`var r=JSON.parse(localStorage.getItem('blog-cat-guestbook-v1')); r.forEach(x=>x.createdAt-=11000); localStorage.setItem('blog-cat-guestbook-v1',JSON.stringify(r)); window.originalSet=Storage.prototype.setItem; Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError')}; document.querySelector('#guestbook-message').value='保存失败时保留草稿'; document.querySelector('#guestbook-form').requestSubmit()`);
  await waitFor(`document.querySelector('#guestbook-status').textContent.includes('未能保存')`);
  assert.equal(await evaluate(`document.querySelector('#guestbook-message').value`),'保存失败时保留草稿');
  await evaluate(`Storage.prototype.setItem=window.originalSet; document.querySelector('#guestbook-message').value=''; document.querySelector('#guestbook-status').textContent=''; document.querySelector('#music-player').classList.add('is-collapsed')`);
  fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  const layouts=[];
  for(const width of [1440,900,768,767,375,320]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await evaluate(`document.querySelector('#cat-guestbook').scrollIntoView({block:'start',behavior:'instant'})`); await pause(1000);
    const layout=await evaluate(`(()=>{const board=document.querySelector('#cat-guestbook'),sticker=document.querySelector('.sticker-card'),b=board.getBoundingClientRect();return {width:innerWidth,left:b.left,right:b.right,gap:board.offsetTop-sticker.offsetTop-sticker.offsetHeight,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    assert(layout.left>=0 && layout.right<=width+1,JSON.stringify(layout));
    assert(layout.gap>=40 && layout.gap<=60,JSON.stringify(layout));
    assert(!layout.overflow,JSON.stringify(layout)); layouts.push(layout);
    if(width===1440 || width===375) {
      const shot=await call('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(__dirname,'artifacts',`guestbook-${width}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  // 长留言板不应因原站的滚动动画可见比例阈值而消失。
  await evaluate(`var demo=Array.from({length:40},(_,i)=>({id:String(i),nickname:'猎人'+i,content:'猫饭好吃喵！'.repeat(20),createdAt:Date.now()-i*11000,tilt:1}));localStorage.setItem('blog-cat-guestbook-v1',JSON.stringify(demo));window.dispatchEvent(new StorageEvent('storage',{key:'blog-cat-guestbook-v1'}));`);
  await waitFor(`document.querySelectorAll('.guestbook-paper').length === 40`);
  assert(await evaluate(`document.querySelector('#cat-guestbook').offsetHeight > 1000 && getComputedStyle(document.querySelector('#cat-guestbook')).opacity === '1' && !document.querySelector('#cat-guestbook').classList.contains('reveal-item')`));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checks:['empty','200 characters including emoji','default nickname','safe text rendering','10 second cooldown across reload','persistence','newest first','storage failure','responsive layout'],layouts},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.closeAllConnections();server.close();});
