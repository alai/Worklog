// 用真实时钟在无头 Chrome 里打开一个页面，等它写出 #SMOKE 或 #ERR 后打印内容并退出。
// 用法：node test/run-browser.js <file:// 地址> [超时秒数]
// 需要 Node 22 以上（用到内置的 fetch 和 WebSocket）。Chrome 路径可用环境变量 CHROME 指定。
// 之所以不用 --virtual-time-budget：工作区加锁走的是浏览器进程间通信，虚拟时钟不等它，结果时好时坏。
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const url = process.argv[2], limit = (+process.argv[3] || 60) * 1000;
if (!url) { console.error('usage: node test/run-browser.js <url> [seconds]'); process.exit(2); }
const chrome = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge']
  .find((p) => !p.startsWith('/') || fs.existsSync(p));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'worklog-smoke-'));   // 每次用全新的配置目录，互不影响
const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const finish = (code, text) => {   // 等 Chrome 真正退出后再删配置目录，否则删不干净
  if (text) console.log(text);
  const done = () => { try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (e) { /* 留着也无妨 */ } process.exit(code); };
  child.once('exit', done); child.kill(); setTimeout(done, 3000);
};
child.on('error', (e) => finish(2, 'Could not start Chrome (' + chrome + '): ' + e.message + '\nSet CHROME=/path/to/chrome'));
(async () => {
  // Chrome 把调试端口打印在 stderr 上
  const port = await new Promise((resolve) => { let buf = ''; child.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) resolve(m[1]); }); setTimeout(() => resolve(null), 15000); });
  if (!port) return finish(2, 'Chrome did not open a debugging port');
  const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  // 无头模式下页面没有窗口焦点，focus/blur 事件不会触发，应用的"退出编辑即提交"就不会执行；打开焦点模拟，行为和真实浏览器一致
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.enable'); await send('Page.navigate', { url });
  for (const t0 = Date.now(); Date.now() - t0 < limit;) {
    await sleep(250);
    const r = await send('Runtime.evaluate', { expression: "[...document.querySelectorAll('#SMOKE,#ERR')].map((x) => x.textContent).join('\\n')", returnByValue: true });
    const text = r && r.result && r.result.value;
    if (text) return finish(/(^|\n)ERROR /.test(text) || /JSERR/.test(text) ? 1 : 0, text);
  }
  finish(1, 'ERROR timed out after ' + limit / 1000 + ' s without a result');
})();
