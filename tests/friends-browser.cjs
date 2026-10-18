// 友链页浏览器验证：示例数据只注入测试服务器响应，不改真实名单。
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-friends-'));
const pause = ms => new Promise(r => setTimeout(r, ms));
let browser, socket;
let injectedFriends = null;
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg'};
  fs.readFile(file, (error, bytes) => {
    if (error) {res.writeHead(404).end(); return;}
    if (file === path.join(root, 'friends.html') && injectedFriends) {
      bytes = Buffer.from(bytes.toString('utf8').replace('const friendLinks = [', 'const friendLinks = [' + injectedFriends.map(x=>JSON.stringify(x)).join(',') + ','));
    }
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
  const origin=`http://127.0.0.1:${server.address().port}`;
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:origin+'/index.html'});
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('.nav-links a[href="friends.html"]')`);
  await evaluate(`document.querySelector('#welcome-close').click();document.querySelector('.nav-links a[href="friends.html"]').click()`);
  await waitFor(`location.pathname === '/friends.html' && document.readyState === 'complete' && typeof renderFriendLinks === 'function'`);
  assert.equal(await evaluate(`document.querySelector('h1').textContent`),'同行猎人名录');
  assert.equal(await evaluate(`document.querySelector('.friends-sign > p').textContent`),'这里钉着和本喵并肩作战的猎人们的名片喵！漏了谁，快去留言板喊本喵！');
  assert.equal(await evaluate(`friendLinks.length`),0);
  assert.equal(await evaluate(`document.querySelector('#friends-empty').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('.exchange-button').getAttribute('href')`),'index.html#cat-guestbook');
  injectedFriends = [
    {name:'测试猎人 · 青提',url:origin+'/about.html',avatar:'assets/avatar.jpg',desc:'沿着有猫爪印的小路，去见新的风景。'},
    {name:'测试猎人 · 林间',url:'forest.example.test',avatar:'assets/cat-sticker-cover.jpg',desc:'把日常写成故事，把猫饭留给朋友。'},
    {name:'测试猎人 · 夜猫',url:'https://night.example.test',avatar:'assets/missing-avatar-test.png',desc:'深夜写字，清晨看云。'},
    {name:'测试猎人 · 远山',url:'https://mountain.example.test',avatar:'',desc:'背包里有书，也有小鱼干。'},
    {name:'<b>安全测试昵称</b>',url:'https://safe.example.test',avatar:'javascript:alert(1)',desc:'<img src=x onerror="window.testXss=1">'},
    {name:'测试猎人 · 星火',url:'http://star.example.test',avatar:'assets/post-photo-2.jpg',desc:'希望每次出发，都有同行的猎人。'},
    {name:'无效地址',url:'javascript:alert(1)',avatar:'',desc:'此卡不应出现'},
    {name:'无效协议',url:'data:text/html,hello',avatar:'',desc:'此卡不应出现'},
    {name:'含凭据的地址',url:'https://name:password@example.test',avatar:'',desc:'此卡不应出现'}
  ];
  await call('Page.reload');
  await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.friend-card').length === 6`);
  await waitFor(`document.querySelectorAll('.friend-avatar img')[0].complete && document.querySelectorAll('.friend-avatar img')[2].complete`);
  assert.equal(await evaluate(`document.querySelectorAll('.friend-card')[1].href`),'https://forest.example.test/');
  assert(await evaluate(`Array.from(document.querySelectorAll('.friend-card')).every(x=>x.target==='_blank' && x.rel==='noopener noreferrer')`));
  assert(await evaluate(`Array.from(document.querySelectorAll('.friend-card')).every(x=>Math.abs(parseFloat(x.style.getPropertyValue('--card-tilt'))) <= 1.5)`));
  assert(await evaluate(`Array.from(document.querySelectorAll('.friend-avatar img')).every(x=>x.loading==='lazy')`));
  assert.equal(await evaluate(`document.querySelectorAll('.friend-avatar img')[0].hidden`),false);
  assert.equal(await evaluate(`document.querySelectorAll('.friend-avatar img')[2].hidden`),true);
  assert.equal(await evaluate(`document.querySelectorAll('.friend-name b, .friend-desc img').length`),0);
  assert.equal(await evaluate(`window.testXss || 0`),0);
  assert.match(await evaluate(`getComputedStyle(document.querySelector('.friend-name')).cursor`),/cursor-link.png/);
  // 实际指针悬停：抬升、摆正、亮蓝描边、小鱼干显现。
  const position=await evaluate(`(()=>{const r=document.querySelector('.friend-card').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...position}); await pause(250);
  const hover=await evaluate(`(()=>{const c=document.querySelector('.friend-card'),s=getComputedStyle(c);return {transform:s.transform,border:s.borderColor,fish:getComputedStyle(c.querySelector('.friend-fish')).opacity}})()`);
  assert.equal(hover.transform,'matrix(1, 0, 0, 1, 0, -4)');assert.equal(hover.border,'rgb(62, 142, 247)');assert.equal(hover.fish,'1');
  // 真正点击后创建新标签页，当前页面保持友链地址。
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...position});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...position});
  let newTarget;
  for(let i=0;i<30;i++){newTarget=(await call('Target.getTargets')).targetInfos.find(t=>t.url===origin+'/about.html');if(newTarget)break;await pause(100);}
  assert(newTarget,'点击未打开新标签页'); await call('Target.closeTarget',{targetId:newTarget.targetId});
  assert.equal(await evaluate(`location.pathname`),'/friends.html');
  // 加入第七条数据，刷新后无需改渲染逻辑就会出现。
  injectedFriends.push({name:'新增测试猎人',url:'new.example.test',avatar:'',desc:'修改数组即可加入'});
  await call('Page.reload'); await waitFor(`document.querySelectorAll('.friend-card').length===7`);
  assert.equal(await evaluate(`document.querySelectorAll('.friend-card')[6].querySelector('.friend-name').textContent`),'新增测试猎人');
  // 断网的头像仍展示 CSS 猫爪。
  await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate(`renderFriendLinks([{name:'离线测试',url:'https://offline.example.test',avatar:'assets/avatar.jpg?offline='+Date.now(),desc:'无网络'}])`);
  await waitFor(`document.querySelector('.friend-avatar img').hidden`);
  await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate(`renderFriendLinks(friendLinks)`);
  // 本地权限不允许复制时可以手动复制，不能假报成功。
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}});document.querySelector('#copy-own-card').click()`);
  await waitFor(`document.querySelector('#copy-card-fallback').hidden===false`);
  assert((await evaluate(`document.querySelector('#copy-card-fallback').value`)).includes('【填你的昵称】'));
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text}}});document.querySelector('#copy-own-card').click()`);
  await waitFor(`document.querySelector('#copy-card-status').textContent.includes('已复制')`);
  assert((await evaluate(`window.copied`)).includes('【填你的头像图链接】'));
  const layouts=[];fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  for(const [width,expected] of [[1440,3],[1024,3],[900,2],[768,2],[767,1],[375,1],[320,1]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);await pause(250);
    const layout=await evaluate(`({width:innerWidth,columns:getComputedStyle(document.querySelector('.friend-grid')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth})`);
    assert.equal(layout.columns,expected);assert.equal(layout.overflow,false);layouts.push(layout);
    if([1440,375].includes(width)) {const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'artifacts','friends-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checks:['navigation','exact subtitle','empty state','inline array refresh','3/2/1 grid','URL validation','safe text','404/offline avatar fallback','lazy loading','hover','new tab','copy and fallback'],layouts},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser?.kill();server.closeAllConnections();server.close();});
