// Worklog 界面：Journal 块编辑器，接内核与本地目录。
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmt(new Date());
const shiftDay = (s, n) => { const [y, m, d] = s.split('-').map(Number); return fmt(new Date(y, m - 1, d + n)); };
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let S = newState(), cur = today(), readOnly = false, rendering = false, ac = null, origin = null;
let showSide = false, prevLines = new Set(), view = 'journal', viewArg = null;
const APP_VERSION = '0.39';
// 外观由三项组合：THEMES 选亮暗（System 跟随系统），PALETTES 选色板，cfg.color 选着色强度（Full/Soft/Mono）。
// 登记在这里的名字会自动出现在 Settings；对应的变量写在 style.css
const THEMES = { light: 'Light', dark: 'Dark' };
const PALETTES = { default: 'Default', solarized: 'Solarized' };   // 色板：和亮暗独立，style.css 里每个色板各有亮、暗两段
const cfg = { chip: 'date', theme: 'system', nav: 'wide', stale: 7, quiet: 14, fold: {}, lifeline: 'text', graphOpen: null, color: 'full', palette: 'default' };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('worklog-cfg') || '{}')); } catch (e) { /* 忽略 */ }
function saveCfg() { try { localStorage.setItem('worklog-cfg', JSON.stringify(cfg)); } catch (e) { /* 忽略 */ } applyTheme(); }
const darkMq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() { const r = document.documentElement; if (PALETTES[cfg.palette] && cfg.palette !== 'default') r.dataset.palette = cfg.palette; else delete r.dataset.palette; r.dataset.color = cfg.color; document.documentElement.dataset.theme = THEMES[cfg.theme] ? cfg.theme : (darkMq && darkMq.matches ? 'dark' : 'light');
  const m = document.querySelector('meta[name=theme-color]'), bg = getComputedStyle(r).getPropertyValue('--bg').trim(); if (m && bg) m.content = bg; }   // 给浏览器的顶栏颜色建议：桌面 Chrome 只在安装成应用时采用
if (darkMq) darkMq.addEventListener('change', applyTheme);
applyTheme();
const dirty = new Set(), force = new Set();
let navCur = null, navIdx = null;   // 键盘导航的焦点：Journal 记块的 key，列表页记第几条
let saveTimer = null, saving = Promise.resolve(), loadInfo = '';
let workspaceLock = null, openingWorkspace = false, lockedOut = false;   // lockedOut：另一个标签页占着这个工作区

function toast(msg) {
  if (!msg) return;
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}
function banner(msg, actions) {
  const b = $('#banner'); b.textContent = '';
  if (!msg) { b.hidden = true; return; }
  b.appendChild(el('span', null, msg));
  for (const [label, fn] of actions || []) { const x = el('button', 'btn', label); x.onclick = fn; b.appendChild(x); }
  b.hidden = false;
}

// ---- 保存：只写发生变化的那一个日期文件，写前校验磁盘上是否被改过 ----
function touch(immediate, date) {
  if (readOnly) return;
  dirty.add(date || cur);
  $('#saved').textContent = 'editing';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, immediate ? 0 : 400);
  if (showSide) updateSide();
}
function flush() {
  saving = saving.then(async () => {
    for (const date of [...dirty]) {
      try {
        ensureIds(S, today(), date);
        const text = serializePage(S, date);
        if (!FS.files.has(date) && !(S.pages[date] || []).some(hasContent)) { dirty.delete(date); continue; }
        if (!force.has(date) && await FS.changed(date)) { conflict(date); continue; }
        await FS.write(date, text);
        dirty.delete(date); force.delete(date);
      } catch (e) { banner('Save failed: ' + e.message + '. Your edits are still in the editor.', [['Retry', () => { banner(); flush(); }]]); return; }
    }
    if (!dirty.size) {
      const d = new Date(); $('#saved').textContent = `saved ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      if (!BK.hold && !lockedOut && FS.data) { BK.remember(FS.files.size, recordCount()); BK.daily(); }   // 跨过午夜一直开着时，第二天的第一次保存补做备份
    }
    if (showSide) updateSide();
  });
  return saving;
}
function conflict(date) {
  banner(`data/${date}.md was changed outside the app while you have unsaved edits.`, [
    ['Load disk version', async () => { banner(); dirty.delete(date); await reloadPage(date); }],
    ['Keep mine', () => { banner(); force.add(date); flush(); }]
  ]);
}
async function reloadPage(date) {
  loadPage(S, date, await FS.read(date), today());
  settle(S, today());
  if (view !== 'journal') drawView(); else if (date === cur) render();
  updateIssues();
}

// ---- 正文渲染 ----
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOKEN = new RegExp(`(\\\\[@#\\[(^\\\\])|\\[\\[PJ\\/([^\\]|\\[]+)\\|(${ID_RE})\\]\\]|\\(\\((${ID_RE})\\)\\)|((?<![A-Za-z0-9])@(?:\\{[^}\\n]+\\}|[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z0-9_-]+)*))|((?<![A-Za-z0-9])#(?:\\{[^}\\n]+\\}|[A-Za-z][A-Za-z0-9_-]*))`, 'g');
// 行内代码原样显示，里面的标签、引用都不解析
function richLine(line, P, byId) { return outsideCode(line, (part) => richPart(part, P, byId), (c) => `<code>${esc(c.slice(1, -1))}</code>`); }
function richPart(line, P, byId) {
  let out = '', i = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    out += esc(line.slice(i, m.index)); i = m.index + m[0].length;
    if (m[1]) out += esc(m[1].slice(1));
    else if (m[3]) out += `<span class="ref" data-pj="${m[3]}">${esc(P[m[3]] ? P[m[3]].name : m[2])}</span>`;
    else if (m[4]) out += refQuote(m[4], byId);
    else if (m[5]) out += `<span class="person">${esc(m[5].replace(/[{}]/g, ''))}</span>`;   // 花括号只是文件里的写法，显示时去掉
    else if (m[6]) out += `<span class="kind">${esc(m[6].replace(/[{}]/g, ''))}</span>`;
  }
  return out + esc(line.slice(i));
}
// ---- 复制 Journal：文本（附带一份 HTML 给邮件）或 Roam 格式 ----
const ROAM_MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function roamDate(d) { const [y, m, n] = d.split('-').map(Number), th = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'; return `[[${ROAM_MONTH[m - 1]} ${n}${th}, ${y}]]`; }
function exportLine(line, roam, ix) {   // 一行正文换成目标格式；代码段原样保留
  return outsideCode(line, (t) => t.replace(TOKEN, (all, esc1, pjName, pj, rec, person, kind) => {
    if (esc1) return esc1.slice(1);
    if (pj) { const path = ix.P[pj] ? projectPath(ix.P, pj) : pjName; return roam ? `[[${path.split(' / ').join('/')}]]` : path; }
    if (rec) return ix.byId[rec] ? '“' + refText(ix.byId[rec]) + '”' : '“unknown record”';
    if (person) { const n = person.slice(1).replace(/[{}]/g, ''); return roam ? `[[${n}]]` : '@' + n; }
    const n = kind.slice(1).replace(/[{}]/g, ''); return roam ? (/\s/.test(n) ? `#[[${n}]]` : '#' + n) : '#' + n;
  }).replace(/\[\[(\d{4}-\d{2}-\d{2})\]\]/g, (all, d) => (roam ? roamDate(d) : d)));
}
function exportJournal(roam) {
  const ix = index(S), sel = navCur && find(S, navCur), list = sel ? [sel.b] : S.pages[cur] || [];
  let n = 0, hidden = 0; const txt = [], html = [];
  const hiddenCount = (bs) => bs.reduce((k, b) => k + (b.del || b.type === 'raw' || (b.type === 'ord' && !hasContent(b)) ? 0 : 1) + hiddenCount(b.children), 0);
  const walk = (bs, depth) => {
    const items = [];
    for (const b of bs) {
      if (b.del || b.type === 'raw' || (b.type === 'ord' && !hasContent(b))) continue;
      n++;
      let first, rest = [], strong = false;
      if (b.type === 'head') { const path = ix.P[b.proj] ? projectPath(ix.P, b.proj) : (b.label || 'unknown project'); first = roam ? `[[${path.split(' / ').join('/')}]]` : path; strong = true; }
      else if (b.type === 'proj' || b.type === 'branch') { const path = b.id && ix.P[b.id] ? projectPath(ix.P, b.id) : b.text; first = (roam ? `[[${path.split(' / ').join('/')}]]` : path) + (b.type === 'proj' ? ' (new project)' : ' (new branch)'); strong = true; }
      else {
        const lines = b.text.split('\n').map((l) => exportLine(l, roam, ix));
        first = lines[0]; rest = lines.slice(1);
        if (b.status) first = (roam ? (b.status === 'DONE' ? '{{[[DONE]]}} ' : b.status === 'WAIT' ? '{{[[TODO]]}} #WAIT ' : '{{[[TODO]]}} ') : `[${b.status}${b.status === 'WAIT' && b.statusDate ? ' since ' + b.statusDate.slice(5) : ''}] `) + first;
      }
      const pad = roam ? '    '.repeat(depth) : '  '.repeat(depth);
      txt.push(roam ? `${pad}- ${first}` : `${pad}${strong ? '■' : '•'} ${first}`);
      for (const r of rest) txt.push(roam ? `${pad}    ${r}` : `${pad}  ${r}`);   // 续行跟在同一条下面
      let kids = '';
      if (b.children.length) { if (jFold.has(b.key)) hidden += hiddenCount(b.children); else kids = walk(b.children, depth + 1); }
      const body = [first, ...rest].map(esc).join('<br>').replace(/`([^`\n]*)`/g, '<code>$1</code>');
      items.push(`<li>${strong ? `<b>${body}</b>` : body}${kids}</li>`);
    }
    return items.length ? `<ul>${items.join('')}</ul>` : '';
  };
  const ul = walk(list, 0);
  if (!n) return { n: 0 };
  const [y, m, d] = cur.split('-').map(Number), title = `${cur} ${WEEK[new Date(y, m - 1, d).getDay()]}`;
  const text = roam ? txt.join('\n') : `${title}\n\n${txt.join('\n')}`;
  return { n, hidden, text, html: `<p><b>${esc(title)}</b></p>${ul}`, sel: !!sel };
}
async function copyJournal(roam) {
  const r = exportJournal(roam);
  if (!r.n) return toast('Nothing to copy on this page');
  try {
    if (!roam && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([r.text], { type: 'text/plain' }), 'text/html': new Blob([r.html], { type: 'text/html' }) })]);
    else await navigator.clipboard.writeText(r.text);
  } catch (e) { return toast('Could not copy: ' + e.message); }
  const btn = $('#copy'); btn.classList.add('done'); clearTimeout(btn._t); btn._t = setTimeout(() => btn.classList.remove('done'), 1500);
  toast(`${roam ? 'Copied for Roam' : 'Copied as text'} · ${r.n} ${r.n === 1 ? 'record' : 'records'}${r.sel ? ' (selected block)' : ''}${r.hidden ? ` · ${r.hidden} folded left out` : ''}`);
  return r;
}
// ---- block 引用 ----
// 被引用记录第一行的纯文字：项目引用换成项目名、花括号去掉；它里面再引用别的记录时只展开一层
function refText(b, depth = 0) {
  const ix = index(S);
  return outsideCode(b.text.split('\n')[0], (t) => t
    .replace(new RegExp(`\\(\\((${ID_RE})\\)\\)`, 'g'), (all, id) => (depth < 1 && ix.byId[id] ? '“' + refText(ix.byId[id], depth + 1) + '”' : '…'))
    .replace(new RegExp(`\\[\\[PJ\\/([^\\]|\\[]+)\\|${ID_RE}\\]\\]`, 'g'), '$1')
    .replace(/([@#])\{([^}\n]+)\}/g, '$1$2'), (c) => c.slice(1, -1));   // 引文是纯文字：代码段只去掉反引号
}
function refWhere(b) { const P = index(S).P; return b.own && b.own !== 'INBOX' && P[b.own] ? projectPath(P, b.own) : 'Inbox'; }
// 正文里的 ((ID)) 显示成带引号的原文；悬停看日期和所属项目，点击跳回原记录
function refQuote(id, byId) {
  const r = byId[id];
  if (!r) return `<span class="qref missing" title="Record ${id} not found">“unknown record”</span>`;
  return `<span class="qref${r.del ? ' del' : ''}" data-rec="${id}" title="${esc(`${r.date} · ${refWhere(r)}${r.del ? ' · deleted' : ''} (click to open)`)}">“${esc(refText(r))}”</span>`;
}

function chipLabel(b) {
  if (cfg.chip === 'none' || !b.statusDate) return b.status;
  if (cfg.chip === 'date') return `${b.status} · ${b.statusDate.slice(5)}`;
  const [y, m, d] = b.statusDate.split('-').map(Number), n = Math.round((new Date(new Date().toDateString()) - new Date(y, m - 1, d)) / 86400000);
  return `${b.status} · ${n <= 0 ? 'today' : n + 'd'}`;
}

// ---- 渲染：只渲染当前页 ----
function ensurePage() {
  if (!S.pages[cur]) S.pages[cur] = [];
  if (!S.pages[cur].length && !readOnly) S.pages[cur].push(mk({ date: cur }));
}
// 已结束项目里的记录只读
function lockedBlock(b, st) {
  const id = b.type === 'ord' ? b.own : b.type === 'head' ? b.proj : b.id;
  return !!(id && st.N[id] && st.N[id].closed);
}
// Journal 的折叠：只记在内存里（块的 key 每次打开都会重新生成）
const jFold = new Set();
const countAll = (list) => list.reduce((n, b) => n + 1 + countAll(b.children), 0);
function unfoldTo(key, list = S.pages[cur] || []) {   // 要聚焦的块如果藏在折叠里，把一路的上级都打开
  for (const b of list) { if (b.key === key || unfoldTo(key, b.children)) { if (b.key !== key) jFold.delete(b.key); return true; } }
  return false;
}
function jFoldBtn() {
  const g = $('#jfold'), tops = (S.pages[cur] || []).filter((b) => b.children.length), all = tops.length && tops.every((b) => jFold.has(b.key));
  g.hidden = !tops.length; if (!tops.length) return;
  g.innerHTML = foldAllIcon(all); tip(g, all ? 'Expand all' : 'Collapse all', 'Z');
  g.onclick = () => {
    if (all) for (const b of tops) jFold.delete(b.key);
    else { for (const b of tops) jFold.add(b.key); const top = navCur && tops.find((b) => b.key === navCur || find(S, navCur) && unfoldPath(b, navCur)); if (top) navCur = top.key; }
    render();
  };
}
const unfoldPath = (b, key) => b.children.some((c) => c.key === key || unfoldPath(c, key));   // key 是否在 b 下面
function toggleFold(b) {
  if (jFold.has(b.key)) jFold.delete(b.key); else { jFold.add(b.key); if (navCur && unfoldPath(b, navCur)) navCur = b.key; }
  render();
}
function render(focusKey, pos) {
  if (view !== 'journal') return;
  rendering = true; closeAc(); ensurePage();
  if (focusKey) unfoldTo(focusKey);
  const [y, m, d] = cur.split('-').map(Number);
  $('#title').textContent = `${cur} ${WEEK[new Date(y, m - 1, d).getDay()]}`;
  const ix = index(S), root = $('#editor');
  ix.st = stats(S, today());
  root.textContent = '';
  const draw = (list, parent) => {
    const wrap = el('div', parent ? 'kids' : 'list');
    for (const b of list) {
      const node = el('div', 'block'); node.dataset.key = b.key;
      node.appendChild(drawRow(b, parent, ix));
      if (b.children.length && jFold.has(b.key)) node.classList.add('shut');
      else if (b.children.length) node.appendChild(draw(b.children, b));
      wrap.appendChild(node);
    }
    return wrap;
  };
  root.appendChild(draw(S.pages[cur], null));
  rendering = false;
  if (showSide) updateSide();
  jFoldBtn(); markCur();
  if (focusKey) focusBlock(focusKey, pos);
}

function fillView(view, b, ix) {
  if (b.type === 'raw') view.textContent = b.text;
  else if (b.type === 'head') view.innerHTML = `<strong class="pjlink" data-pj="${b.proj}">${esc(ix.P[b.proj] ? projectPath(ix.P, b.proj) : (b.label || 'unknown project'))}</strong>`;
  else if (b.type !== 'ord') view.innerHTML = `<strong>${esc(b.text)}</strong>`;
  else if (!hasContent(b)) view.innerHTML = '<span class="ph">Type here. [[ for projects.</span>';
  else view.innerHTML = b.text.split('\n').map((l, i) => `<div class="${i ? 'cont' : ''}">${richLine(l, ix.P, ix.byId) || '&nbsp;'}</div>`).join('');
}

function drawRow(b, parent, ix) {
  const P = ix.P, locked = readOnly || lockedBlock(b, ix.st || (ix.st = stats(S, today())));
  const row = el('div', 'row' + (b.del ? ' deleted' : '') + (b.type === 'raw' ? ' raw' : b.type !== 'ord' ? ' decl' : ''));
  const bul = el('span', 'bullet' + (b.type === 'head' ? ' ring' : b.type === 'proj' || b.type === 'branch' ? ' square' : ''));
  row.appendChild(bul);
  if (!locked && !b.del) dragBullet(bul, b);
  if (b.children.length) {   // 有子项的块可以折叠：箭头平时悬停才出现，折叠后一直显示
    const shut = jFold.has(b.key), n = countAll(b.children), c = el('button', 'jchev' + (shut ? ' shut' : ''));
    c.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5L7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    c.setAttribute('aria-expanded', String(!shut)); tip(c, shut ? `Expand (${n} inside)` : 'Collapse');
    c.onmousedown = (e) => e.preventDefault(); c.onclick = (e) => { e.stopPropagation(); toggleFold(b); };
    row.appendChild(c);
    if (shut) { const m = el('button', 'jmore', `+${n}`); tip(m, `${n} hidden · click to expand`); m.onmousedown = (e) => e.preventDefault(); m.onclick = (e) => { e.stopPropagation(); toggleFold(b); }; row._more = m; }
  }
  if (b.type === 'ord' && b.status) {
    const st = el('button', 'status ' + b.status, chipLabel(b));
    st.title = `Edit status · ${b.status} since ${b.statusDate}`;
    if (!b.del && !locked) st.onclick = () => editStatus(b, st);
    row.appendChild(st);
  }
  const body = el('div', 'body'), view = el('div', 'view');
  fillView(view, b, ix);
  body.appendChild(view);
  if (b.type !== 'raw') {
    const ta = el('textarea'); ta.rows = 1; ta.spellcheck = false;
    ta.value = b.type === 'head' ? (P[b.proj] ? projectPath(P, b.proj) : (b.label || 'unknown project')) : b.text;
    ta.setAttribute('aria-label', b.type === 'head' ? 'Project heading' : b.type !== 'ord' ? 'Project name' : 'Record');
    if (locked || b.del || b.dup || b.type === 'head') ta.readOnly = true;
    view.onclick = (e) => { if (jump(e)) return; focusBlock(b.key, b.text.length); };
    ta.onfocus = () => { row.classList.add('editing'); grow(ta); };
    ta.onfocus = () => { ta._t0 = ta.value; };   // 记下进入编辑时的文字，退出时据此判断有没有改过
    ta.onblur = (e) => onBlur(e, b, row, parent);
    ta.oninput = (e) => { if (ta.readOnly) return; pairBrackets(ta, e); checkRef(ta, e, b); b.text = ta.value; grow(ta); touch(false); checkAc(b, ta); checkDate(ta); checkTag(ta); };
    ta.addEventListener('keydown', (e) => { if (codeKeys(ta, e)) return; if (!ta.readOnly && pairKeys(ta, e)) { b.text = ta.value; grow(ta); touch(false); checkAc(b, ta); } });
    ta.onkeydown = (e) => onKey(e, b, ta);
    body.appendChild(ta);
  }
  row.appendChild(body);
  if (row._more) row.appendChild(row._more);

  if (b.type === 'proj') bul.title = `Project, created ${b.date}`;
  if (b.type === 'head') bul.title = 'Project heading';
  if (b.type === 'branch') {
    const pname = P[b.owner] ? P[b.owner].name : 'unknown';
    bul.title = `Branch of ${pname}, created ${b.date}`;
    if (ownerAt(S, b.key) !== b.owner) row.appendChild(el('span', 'tag line', 'of ' + pname));
  }
  if (b.type === 'raw') row.appendChild(el('span', 'tag warn', b.err ? 'unparsed record' : 'unrecognized line'));
  if (b.dup) row.appendChild(el('span', 'tag err', 'duplicate ID'));
  if (b.conflict && !readOnly) {
    row.appendChild(el('span', 'tag warn', 'owner conflict'));
    const now = ownerAt(S, b.key), name = (id) => id === 'INBOX' ? 'Inbox' : (P[id] ? P[id].name : id);
    const a = el('button', 'mini', 'Keep ' + name(now)); a.onclick = () => resolve(b, false); row.appendChild(a);
    if (P[b.conflict]) { const c = el('button', 'mini', 'Move to ' + name(b.conflict)); c.onclick = () => resolve(b, true); row.appendChild(c); }
  }
  const lone = b.type === 'ord' && !b.status && !b.del ? b.text.trim().match(/^\[\[(?:PJ\/)?([^\[\]|]+)\]\]$/) : null;
  if (lone && !/^\d{4}-\d{2}-\d{2}$/.test(lone[1]) && !readOnly) {
    const own = ownerAt(S, b.key), name = lone[1].trim();
    row.appendChild(el('span', 'muted', 'no such project'));
    const make = (label, kind, ctx) => { const x = el('button', 'mini', label); x.onclick = () => { b.text = ''; createProject(S, b.key, name, kind, ctx); touch(true); render(b.key, 0); }; row.appendChild(x); };
    if (own !== 'INBOX' && P[own]) make('New branch of ' + P[own].name, 'branch', own);
    make('New project', 'proj', null);
  }
  if (b.type === 'ord' && !parent && hasContent(b)) row.appendChild(el('span', 'tag dash', 'Inbox'));
  if (b.extParent) row.appendChild(el('span', 'tag line', '↳ ' + (ix.byId[b.extParent] ? ix.byId[b.extParent].text.split('\n')[0].slice(0, 16) : b.extParent)));
  if (b.date !== cur) row.appendChild(el('span', 'tag line', b.date.slice(5)));
  if (b.id && b.type === 'ord' && !b.del) { const bl = (ix.brefs.get(b.id) || []).filter((x) => !x.del); if (bl.length) row.appendChild(backlinkBtn(b, bl)); }   // 被别的记录引用
  if (b.del) {
    row.appendChild(el('span', 'tag warn', 'deleted ' + b.del.slice(5)));
    if (!readOnly) { const un = el('button', 'mini', 'Restore'); un.onclick = () => { b.del = null; bump(S); touch(true); render(); }; row.appendChild(un); }
  } else if (b.type !== 'raw' && !locked) {
    const x = el('button', 'mini del', '×'); tip(x, 'Delete block');
    x.onmousedown = (e) => e.preventDefault();
    x.onclick = () => { const r = deleteBlock(S, b.key, today()); toast(r.msg); if (r.ok) { touch(true); render(); } };
    row.appendChild(x);
  }
  return row;
}

function resolve(b, byMark) { resolveConflict(S, b.key, byMark); settle(S, today()); touch(true); render(); updateIssues(); }
function grow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

function focusBlock(key, pos) {
  const node = document.querySelector(`.block[data-key="${key}"] > .row`), ta = node && node.querySelector('textarea');
  if (!ta) return;
  navCur = key; setCur(node);
  node.classList.add('editing');
  ta.focus(); grow(ta);
  const p = pos == null ? ta.value.length : Math.min(pos, ta.value.length);
  ta.setSelectionRange(p, p);
}

function onBlur(e, b, row, parent) {
  if (rendering || !row.isConnected) return;
  closeAc(); origin = null;
  const v = S.ver, ta = e.target;
  // 只改了文字时 commitBlock 不一定让索引失效；这里补上，标签页、补全候选、反向链接才会立刻更新，也会立即保存
  if (!readOnly && ta && ta._t0 !== undefined && ta._t0 !== ta.value) { ta._t0 = ta.value; retext(S, b); }
  if (!readOnly) commitBlock(S, b, today());
  const ix = index(S);
  if (e.relatedTarget && row.contains(e.relatedTarget)) { row.classList.remove('editing'); fillView(row.querySelector('.view'), b, ix); if (b.type === 'ord') row.querySelector('textarea').value = b.text; }
  else { row.replaceWith(drawRow(b, parent, ix)); markCur(); }
  if (v !== S.ver) { touch(true); refreshBacklinks(); }
}

// 快捷键循环切换：进入新状态写当天日期，切回本次编辑开始时的状态则恢复原日期
function cycle(b) {
  if (!origin || origin.key !== b.key) origin = { key: b.key, status: b.status, date: b.statusDate };
  if (!cycleStatus(S, b.key, today())) return false;
  if (b.status === origin.status) b.statusDate = origin.date;
  return true;
}

// 点击状态标签：编辑 [TODO:2026-11-13] 这段原文
function editStatus(b, chip) {
  const inp = el('input', 'status-edit'); inp.value = `[${b.status}:${b.statusDate}]`; inp.setAttribute('aria-label', 'Status source'); inp.spellcheck = false;
  let done = false;
  const finish = (apply) => {
    if (done) return; done = true;
    if (apply) {
      const v = inp.value.trim(), m = v.match(/^\[(TODO|WAIT|DONE)(?::(\d{4}-\d{2}-\d{2}))?\]$/);
      if (v === '') { b.status = null; b.statusDate = null; }
      else if (m && (!m[2] || validDate(m[2]))) { b.status = m[1]; b.statusDate = m[2] || today(); }
      else toast('Use the form [TODO:2026-11-13] with TODO, WAIT or DONE. Nothing was changed');
      origin = null; bump(S); touch(true);
    }
    render();
  };
  inp.onkeydown = (e) => { if (e.isComposing) return; if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
  inp.onblur = () => finish(true);
  chip.replaceWith(inp); inp.focus(); inp.select();
}

// ---- 键盘 ----
function onKey(e, b, ta) {
  if (e.isComposing || e.keyCode === 229) return;
  if (ac && handleAcKey(e, b, ta)) return;
  if (e.key === 'Escape') { e.preventDefault(); ta.blur(); return; }
  const pos = ta.selectionStart, noSel = ta.selectionStart === ta.selectionEnd;
  if (e.key === 'ArrowUp' && !e.altKey && !ta.value.slice(0, pos).includes('\n')) { if (hop(b, -1)) e.preventDefault(); return; }
  if (e.key === 'ArrowDown' && !e.altKey && !ta.value.slice(pos).includes('\n')) { if (hop(b, 1)) e.preventDefault(); return; }
  if (readOnly || lockedBlock(b, stats(S, today()))) return;
  const mod = e.ctrlKey || e.metaKey;
  const done = (key, p) => { e.preventDefault(); touch(true); render(key, p); };

  if (e.key === 'Enter' && mod) { commitBlock(S, b, today()); if (cycle(b)) done(b.key, pos); else e.preventDefault(); return; }
  if (e.key === 'Enter' && !e.shiftKey) {
    const atEnd = pos >= b.text.length; commitBlock(S, b, today());
    const p = atEnd ? b.text.length : Math.min(pos, b.text.length);
    if (b.type !== 'ord' || p >= b.text.length) return done(newAfter(S, b.key).key, 0);
    if (p === 0) { newBefore(S, b.key); return done(b.key, 0); }
    return done(split(S, b.key, p).key, 0);
  }
  if (e.key === 'Tab') {
    commitBlock(S, b, today());
    const ok = e.shiftKey ? outdent(S, b.key) : indent(S, b.key);
    if (!ok && !e.shiftKey) toast('There is no block above to indent under');
    return done(b.key, pos);
  }
  if (e.key === 'Backspace' && (b.type === 'head' || (noSel && pos === 0))) {
    const order = flat(S, cur).filter((x) => x.type !== 'raw'), i = order.indexOf(b);
    if (!hasContent(b) || b.type === 'head') {
      if (order.length === 1) { e.preventDefault(); return; }
      const r = deleteBlock(S, b.key, today()); toast(r.msg);
      if (r.ok && !r.soft) { const t = [order[i - 1], ...order.slice(i + 1)].find((x) => x && find(S, x.key)); return done(t && t.key, null); }
      e.preventDefault(); return;
    }
    const r = mergeUp(S, b.key); toast(r.msg);
    if (r.ok) return done(r.focus, r.pos);
    e.preventDefault(); return;
  }
  const dir = moveDir(e);
  if (dir) { e.preventDefault(); if (moveBlock(b.key, dir)) render(b.key, pos); return; }
}
// 上下移动记录：Alt+Shift+↑↓ 或 Alt+Shift+J/K（按物理键判断，Mac 上 Option 会把 J/K 变成别的字符）
function stepDay(n) { go(shiftDay(cur, n)); }
function jumpDay(dir) {   // 跳到前 / 后一个有记录的日子，中间的空白日期跳过
  const days = Object.keys(S.pages).filter((d) => validDate(d) && (dir < 0 ? d < cur : d > cur) && S.pages[d].some(hasContent)).sort();
  const d = dir < 0 ? days[days.length - 1] : days[0];
  if (d) go(d); else toast(dir < 0 ? 'No earlier days with records' : 'No later days with records');
}
function moveDir(e) {
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.isComposing) return 0;
  return e.key === 'ArrowUp' || e.code === 'KeyK' ? -1 : e.key === 'ArrowDown' || e.code === 'KeyJ' ? 1 : 0;
}
// 只在同一层的兄弟之间移动；跨到别的项目下面是 Tab / Shift+Tab 的事
function moveBlock(key, dir) {
  const loc = find(S, key);
  if (readOnly || !loc || lockedBlock(loc.b, stats(S, today()))) return false;
  if (!move(S, key, dir)) { toast(dir < 0 ? 'Already first in this group' : 'Already last in this group'); return false; }
  touch(true); return true;
}
// 拖动圆点调整顺序，规则和键盘移动一样
function dragBullet(bul, b) {
  bul.classList.add('grip'); tip(bul, 'Drag to reorder', 'Alt+Shift+↑↓');
  bul.onpointerdown = (e) => {
    if (e.button !== 0 || readOnly) return;
    const node = bul.closest('.block'), wrap = node && node.parentNode, others = wrap ? [...wrap.children].filter((x) => x !== node && x.classList.contains('block')) : [];
    if (!others.length) return;
    e.preventDefault();
    const y0 = e.clientY; let on = false, before;
    const line = $('#dropline');
    const end = (ok) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', esc, true);
      line.hidden = true; node.classList.remove('dragging'); document.body.classList.remove('reordering');
      if (!ok || !on) return;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // 先把正在编辑的文字提交
      if (moveBlock_(b.key, before)) { navCur = b.key; render(); }
    };
    const mv = (ev) => {
      if (!on && Math.abs(ev.clientY - y0) < 4) return;
      if (!on) { on = true; node.classList.add('dragging'); document.body.classList.add('reordering'); }
      let g = others.findIndex((x) => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (g < 0) g = others.length;
      before = others[g] ? others[g].dataset.key : null;
      const wr = wrap.getBoundingClientRect(), y = others[g] ? others[g].getBoundingClientRect().top : others[others.length - 1].getBoundingClientRect().bottom;
      line.style.top = (y - 1) + 'px'; line.style.left = wr.left + 'px'; line.style.width = wr.width + 'px'; line.hidden = false;
    };
    const up = () => end(true), cancel = () => end(false), esc = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(false); } };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', esc, true);
  };
}
function moveBlock_(key, beforeKey) {
  const loc = find(S, key);
  if (readOnly || !loc || lockedBlock(loc.b, stats(S, today())) || !moveBefore(S, key, beforeKey)) return false;
  touch(true); return true;
}
function hop(b, dir) {
  const order = flat(S, cur).filter((x) => x.type !== 'raw'), t = order[order.indexOf(b) + dir];
  if (t) focusBlock(t.key, dir < 0 ? null : 0);
  return !!t;
}

// ---- [[ 项目补全 ----
// 输入 [[ 自动补上 ]]，光标留在中间；紧接着手敲 ] 只是越过已有的 ]，删掉 [[ 时连同补上的 ]] 一起删
function pairBrackets(ta, e) {
  if (!e || e.inputType !== 'insertText' || e.data !== '[' || e.isComposing) return;
  const p = ta.selectionStart, v = ta.value;
  if (p !== ta.selectionEnd || v.slice(p - 2, p) !== '[[' || v[p - 3] === '[' || v.slice(p, p + 2) === ']]' || inCode(v.slice(0, p))) return;
  ta.value = v.slice(0, p) + ']]' + v.slice(p); ta.setSelectionRange(p, p);
}
// 反引号：打出开头的 ` 自动补上结尾的 `；选中文字时包起来；结尾处再打 ` 跳过；空的 `` 中间退格一起删
function codeKeys(ta, e) {
  if (ta.readOnly || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  const p = ta.selectionStart, q = ta.selectionEnd, v = ta.value, done = (val, a, z = a) => { e.preventDefault(); e.stopPropagation(); ta.value = val; ta.setSelectionRange(a, z); ta.dispatchEvent(new Event('input')); return true; };
  if (e.key === '`') {
    if (p !== q) { if (v.slice(p, q).includes('\n')) return false; return done(v.slice(0, p) + '`' + v.slice(p, q) + '`' + v.slice(q), p + 1, q + 1); }
    if (inCode(v.slice(0, p))) { if (v[p] === '`') { e.preventDefault(); e.stopPropagation(); ta.setSelectionRange(p + 1, p + 1); return true; } return false; }
    if (v[p - 1] === '`' || (v[p] && !/\s/.test(v[p]))) return false;   // 连打 ``、或紧贴着文字时不补
    return done(v.slice(0, p) + '``' + v.slice(p), p + 1);
  }
  if (e.key === 'Backspace' && p === q && v[p - 1] === '`' && v[p] === '`' && inCode(v.slice(0, p))) return done(v.slice(0, p - 1) + v.slice(p + 1), p - 1);
  return false;
}
function pairKeys(ta, e) {
  const p = ta.selectionStart, v = ta.value;
  if (p !== ta.selectionEnd || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  if (e.key === ']' && v[p] === ']' && /\[\[[^\[\]\n]*\]?$/.test(v.slice(0, p))) { e.preventDefault(); ta.setSelectionRange(p + 1, p + 1); return true; }
  if (e.key === 'Backspace' && v.slice(p - 2, p) === '[[' && v.slice(p, p + 2) === ']]') { e.preventDefault(); ta.value = v.slice(0, p - 1) + v.slice(p + 2); ta.setSelectionRange(p - 1, p - 1); return true; }
  return false;
}
function checkAc(b, ta) {
  const upto = ta.value.slice(0, ta.selectionStart);
  const m = b.type === 'ord' && !inCode(upto) ? upto.match(/\[\[([^\[\]\n|`]*)(?:\]\])?$/) : null;
  if (!m) return closeAc();
  const start = upto.length - m[0].length, atStart = upto.slice(0, start).trim() === '';
  const q = m[1].replace(/^PJ\//, '').trim(), P = projects(S), nq = normName(q), items = [];
  const exact = Object.values(P).some((p) => normName(p.name) === nq);
  const own = ownerAt(S, b.key), ctx = own !== 'INBOX' ? own : null;
  const restEmpty = (ta.value.slice(0, start) + ta.value.slice(ta.selectionStart)).replace(/^\]\]/, '').trim() === '';
  for (const p of Object.values(P)) {
    const n = normName(p.name);
    if (p.life || (nq && !n.includes(nq) && !nq.includes(n))) continue;
    const act = !atStart ? 'ref' : restEmpty ? 'head' : 'wrap';
    items.push({ act, id: p.id, title: projectPath(P, p.id), sub: { ref: 'Insert reference', head: 'Use as project heading', wrap: 'Move this block into the project' }[act] });
  }
  if (q && !exact && atStart) {
    if (ctx && P[ctx]) items.push({ act: 'branch', ctx, title: `New branch of ${P[ctx].name}`, sub: `“${q}”`, create: true });
    items.push({ act: 'proj', title: 'New project', sub: `“${q}”`, create: true });
  }
  if (!items.length) return closeAc();
  ac = { key: b.key, start, items, sel: 0 };
  drawAc(ta);
}
// 补全菜单的公共画法（[[ 项目菜单和 @ / # 补全共用）：单行条目，标题在左、说明在右；
// 所有条目的说明相同时只在顶部写一次，不逐行重复；下方放不下就放到输入框上方
function drawMenu(box, ta, rows, sel, onPick) {
  box.textContent = '';
  const plain = rows.filter((r) => !r.create), subs = new Set(plain.map((r) => r.sub));
  const shared = plain.length > 1 && subs.size === 1 ? [...subs][0] : '';   // 新建项各自保留说明
  if (shared) box.appendChild(el('div', 'ac-head', shared));
  rows.forEach((it, i) => {
    const b = el('button', 'ac-item' + (i === sel ? ' on' : '') + (it.create ? ' create' : ''));
    b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === sel));
    if (it.lead) b.appendChild(el('span', 'ac-date', it.lead));
    const tt = el('span', 'ac-title'); if (it.html) tt.innerHTML = it.html; else tt.textContent = it.title; b.appendChild(tt);
    if (it.sub && (it.create || !shared)) b.appendChild(el('span', 'ac-sub', it.sub));
    if (it.tip) b.title = it.tip;
    b.onmousedown = (e) => { e.preventDefault(); onPick(i); };
    box.appendChild(b);
  });
  box.hidden = false;
  const r = ta.getBoundingClientRect(), h = box.offsetHeight, w = box.offsetWidth;
  box.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  box.style.top = (r.bottom + h + 8 > innerHeight && r.top > h + 8 ? r.top - h - 4 : r.bottom + 4) + 'px';
  const on = box.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
function drawAc(ta) {
  drawMenu($('#ac'), ta, ac.items, ac.sel, (i) => { ac.sel = i; applyAc(ta); });
}
// 悬停提示的统一写法：动作或状态，句首大写、不加句号；快捷键放在末尾括号里，多个键用 · 隔开
function tip(node, text, keys) { node.title = keys ? `${text} (${keys})` : text; node.setAttribute('aria-label', text); return node; }
function closeAc() { ac = null; const box = $('#ac'); if (box) box.hidden = true; }
function handleAcKey(e, b, ta) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ac.sel = (ac.sel + (e.key === 'ArrowDown' ? 1 : ac.items.length - 1)) % ac.items.length; drawAc(ta); return true; }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyAc(ta); return true; }
  if (e.key === 'Escape') { e.preventDefault(); closeAc(); return true; }
  return false;
}
function applyAc(ta) {
  const it = ac.items[ac.sel], { b } = find(S, ac.key), end = ta.selectionStart, P = projects(S);
  const head = b.text.slice(0, ac.start), tail = b.text.slice(end).replace(/^\]\]/, '');
  let pos = head.length;
  if (it.act === 'ref') { const ins = `[[PJ/${P[it.id].name}|${it.id}]] `; b.text = head + ins + tail; pos += ins.length; bump(S); }
  else {
    b.text = (head + tail).replace(/^\s+/, ''); pos = 0;
    if (it.act === 'head') { b.type = 'head'; b.proj = it.id; b.text = ''; b.status = null; bump(S); const nb = newAfter(S, b.key); touch(true); return render(nb.key, 0); }
    if (it.act === 'wrap') toast(wrapInProject(S, b.key, it.id).msg);
    else createProject(S, b.key, it.sub, it.act, it.ctx);
  }
  touch(true); render(b.key, pos);
}

// ---- 侧面板：原文与问题列表 ----
function updateSide() {
  const text = serializePage(S, cur), pre = $('#raw'); pre.textContent = '';
  const lines = text.replace(/\n$/, '').split('\n'), next = new Set(lines);
  const metaRe = new RegExp(`^(.*?)( \\(\\(${ID_RE}\\)\\)(?: \\^\\w+\\(.*\\))*)$`);
  for (const l of lines) {
    const d = el('div', 'ln' + (prevLines.size && !prevLines.has(l) && l ? ' chg' : '')), m = l.trim().startsWith('- ') && l.match(metaRe);
    if (m) d.append(document.createTextNode(m[1]), el('span', 'meta', m[2])); else d.textContent = l || ' ';
    pre.appendChild(d);
  }
  prevLines = next;
}
function updateIssues() { drawNav(); if (view === 'issues') drawView(); }

async function go(date, focusKey) {
  flush();
  cur = date; prevLines = new Set(); navCur = null; navIdx = null;
  if (view !== 'journal') { view = 'journal'; $('#journal').hidden = false; $('#view').hidden = true; drawNav(); }
  $('#file').textContent = `data/${cur}.md`;
  // 先按内存里的内容立刻画出来：标题、正文、文件名、Source 永远是同一天。
  // 以前是先查磁盘再画，查磁盘一出错（比如应用开着时数据文件夹被替换，旧的文件句柄失效）就跳过了重画
  render(focusKey);
  if (!FS.files.has(date) || dirty.has(date)) return;
  try {
    // 文件被外部编辑器改过就重新载入；等待期间如果已经翻到别的日期，就不再管这一天
    if (await FS.changed(date) && cur === date && !dirty.has(date)) { await reloadPage(date); toast('Loaded the newer version from disk'); }
  } catch (e) {
    if (cur === date && !BK.hold) banner(`Could not read data/${date}.md from disk (${e.message}). The folder may have been moved or replaced while Worklog was open.`, [['Rescan workspace', () => openWorkspace(() => true)], ['Dismiss', () => banner()]]);
  }
}

// ---- 启动 ----
async function releaseWorkspaceLock() {
  const lock = workspaceLock;
  if (!lock) return;
  workspaceLock = null;
  lock.release();
  await lock.done;
}

async function acquireWorkspaceLock() {
  if (!navigator.locks) return true;
  const name = 'worklog:' + FS.dir.name;
  if (workspaceLock?.name === name) return true;
  await releaseWorkspaceLock();
  return new Promise((resolve, reject) => {
    const done = navigator.locks.request(name, { ifAvailable: true }, (lock) => {
      if (!lock) { resolve(false); return; }
      return new Promise((release) => {
        workspaceLock = { name, release, done };
        resolve(true);
      });
    });
    done.catch(reject);
  });
}

async function openWorkspace(select, afterOpen) {
  if (openingWorkspace) return;
  const app = $('#app');
  let loading = false;
  openingWorkspace = app.inert = true;
  try {
    if (dirty.size) {
      await flush();
      if (dirty.size) return;
    }
    if (await select() === false) return;
    loading = true;
    await start();
    loading = false;
    if (afterOpen) afterOpen();
  } catch (e) {
    if (loading) {
      app.hidden = true;
      $('#gate').hidden = false;
      await releaseWorkspaceLock();
    }
    if (e.name === 'AbortError') return;
    if (app.hidden) $('#gate-msg').textContent = 'Could not open the folder: ' + e.message;
    else toast(e.message);
  } finally {
    openingWorkspace = app.inert = false;
  }
}

async function start() {
  lockedOut = !await acquireWorkspaceLock(); readOnly = lockedOut;
  const t0 = performance.now();
  const pairs = await FS.loadAll(), t1 = performance.now(), back = [];
  $('#gate').hidden = true; $('#app').hidden = false;
  // 文件数比上次骤减（比如 data 被空文件夹覆盖了）：先停下来、不写任何东西，让用户决定
  const prev = lockedOut ? null : BK.check(pairs.length);
  BK.hold = prev ? { files: pairs.length, prev } : null;
  if (BK.hold) { readOnly = true; holdBanner(); }
  else banner(readOnly ? 'This workspace is open in another tab. This tab is read-only.' : '');
  S = newState();
  let n = 0;
  for (const [date, text] of pairs) { if (loadPage(S, date, text, today()).needsWrite) back.push(date); }
  settle(S, today());
  eachBlock(S, () => n++);
  const t2 = performance.now();
  loadInfo = `${FS.dir.name} · ${pairs.length} files · ${n} records · read ${Math.round(t1 - t0)} ms · parse ${Math.round(t2 - t1)} ms`;
  $('#stats').textContent = loadInfo;
  // 手写行正规化后写回；刚被改过的文件暂缓，避免和外部编辑器抢写
  if (!readOnly) { for (const d of back) if (FS.age(d) > 5000) dirty.add(d); if (dirty.size) flush(); }
  updateIssues();
  await go(cur);
  if (!BK.hold && !lockedOut) { BK.remember(pairs.length, n); BK.daily(pairs); }   // 每天第一次打开时备份，不阻塞界面
}

async function boot() {
  $('#prev').onclick = () => stepDay(-1);
  $('#next').onclick = () => stepDay(1);
  $('#today').onclick = () => go(today());
  $('#copy').onclick = () => copyJournal(false); tip($('#copy'), 'Copy as text', 'Y');
  tip($('#prev'), 'Previous day', 'H'); tip($('#next'), 'Next day', 'L'); tip($('#today'), 'Go to today', 'T');
  $('#add').onclick = () => { if (readOnly) return; const nb = mk({ date: cur }); S.pages[cur].push(nb); render(nb.key, 0); };
  $('#side-toggle').onclick = () => { showSide = !showSide; $('#side').hidden = !showSide; $('#side-toggle').setAttribute('aria-pressed', String(showSide)); if (showSide) { prevLines = new Set(); updateSide(); } };
  $('#nav-toggle').onclick = () => { cfg.nav = cfg.nav === 'narrow' ? 'wide' : 'narrow'; saveCfg(); drawNav(); };
  $('#help-btn').onclick = () => toggleHelp();
  // 点日期打开选择器；跳到某一天只是换页，那天写了内容才会生成文件
  $('#title').onclick = () => { if (dp) return closeDate(); openDate($('#title'), cur, (s) => go(s)); };
  // 搜索：清空搜索框就回到搜索之前所在的页面；Enter 把焦点交还页面（接着用 J/K），Esc 清空并退出
  let qTimer = null, before = null;
  const runSearch = (q) => {
    if (q) { if (view !== 'search') before = [view, viewArg]; show('search', q); }
    else if (view === 'search') { const [v, a] = before || ['journal']; before = null; show(v, a); }
  };
  $('#q').oninput = (e) => { clearTimeout(qTimer); const q = e.target.value.trim(); qTimer = setTimeout(() => runSearch(q), q ? 150 : 0); };
  $('#q').onkeydown = (e) => {
    if (e.isComposing) return;
    if (e.key === 'Escape') { clearTimeout(qTimer); e.target.value = ''; runSearch(''); e.target.blur(); }
    else if (e.key === 'Enter') { clearTimeout(qTimer); runSearch(e.target.value.trim()); e.target.blur(); }
  };
  window.addEventListener('resize', closeAc);
  $('#editor-wrap').addEventListener('scroll', closeAc);
  window.addEventListener('focus', async () => {
    if (openingWorkspace || $('#app').hidden || !FS.files.has(cur)) return;
    const date = cur, state = S;
    try {
      if (await FS.changed(date) && !openingWorkspace && S === state) {
        if (dirty.has(date)) conflict(date);
        else { await reloadPage(date); toast('Loaded the newer version from disk'); }
      }
    } catch (e) { /* 目录暂时不可用时忽略 */ }
  });
  window.addEventListener('beforeunload', (e) => { if (dirty.size) { flush(); e.preventDefault(); } });

  if (!FS.supported()) { $('#gate-msg').textContent = 'This browser cannot open local folders. Use desktop Chrome or Edge.'; $('#pick').hidden = true; return; }
  $('#pick').onclick = () => openWorkspace(() => FS.pick());
  const state = await FS.restore();
  if (state === 'ready') return openWorkspace(() => true);
  if (state === 'prompt') { const r = $('#regrant'); r.textContent = `Reopen “${FS.dir.name}”`; r.hidden = false; r.onclick = () => openWorkspace(() => FS.grant()); }
}
document.addEventListener('DOMContentLoaded', boot);
