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
const APP_VERSION = '0.31';
// 主题机制：一个主题就是 style.css 里一组 :root[data-theme=x] 变量；在这里登记名字即可出现在 Settings
const THEMES = { light: 'Light', dark: 'Dark' };
const cfg = { chip: 'date', theme: 'system', nav: 'wide', stale: 7, fold: {}, lifeline: 'text', graphOpen: null, color: 'full' };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('worklog-cfg') || '{}')); } catch (e) { /* 忽略 */ }
function saveCfg() { try { localStorage.setItem('worklog-cfg', JSON.stringify(cfg)); } catch (e) { /* 忽略 */ } applyTheme(); }
const darkMq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() { document.documentElement.dataset.color = cfg.color; document.documentElement.dataset.theme = THEMES[cfg.theme] ? cfg.theme : (darkMq && darkMq.matches ? 'dark' : 'light'); }
if (darkMq) darkMq.addEventListener('change', applyTheme);
applyTheme();
const dirty = new Set(), force = new Set();
let navCur = null, navIdx = null;   // 键盘导航的焦点：Journal 记块的 key，列表页记第几条
let saveTimer = null, saving = Promise.resolve(), loadInfo = '';
let workspaceLock = null, openingWorkspace = false;

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
    if (!dirty.size) { const d = new Date(); $('#saved').textContent = `saved ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
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
function richLine(line, P, byId) {
  let out = '', i = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    out += esc(line.slice(i, m.index)); i = m.index + m[0].length;
    if (m[1]) out += esc(m[1].slice(1));
    else if (m[3]) out += `<span class="ref" data-pj="${m[3]}">${esc(P[m[3]] ? P[m[3]].name : m[2])}</span>`;
    else if (m[4]) out += `<span class="ref rec">${esc(byId[m[4]] ? byId[m[4]].text.split('\n')[0].slice(0, 24) : 'unknown record')}</span>`;
    else if (m[5]) out += `<span class="person">${esc(m[5].replace(/[{}]/g, ''))}</span>`;   // 花括号只是文件里的写法，显示时去掉
    else if (m[6]) out += `<span class="kind">${esc(m[6].replace(/[{}]/g, ''))}</span>`;
  }
  return out + esc(line.slice(i));
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
function render(focusKey, pos) {
  if (view !== 'journal') return;
  rendering = true; closeAc(); ensurePage();
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
      if (b.children.length) node.appendChild(draw(b.children, b));
      wrap.appendChild(node);
    }
    return wrap;
  };
  root.appendChild(draw(S.pages[cur], null));
  rendering = false;
  if (showSide) updateSide();
  markCur();
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
    ta.onblur = (e) => onBlur(e, b, row, parent);
    ta.oninput = (e) => { if (ta.readOnly) return; pairBrackets(ta, e); b.text = ta.value; grow(ta); touch(false); checkAc(b, ta); checkDate(ta); };
    ta.addEventListener('keydown', (e) => { if (!ta.readOnly && pairKeys(ta, e)) { b.text = ta.value; grow(ta); touch(false); checkAc(b, ta); } });
    ta.onkeydown = (e) => onKey(e, b, ta);
    body.appendChild(ta);
  }
  row.appendChild(body);

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
  const v = S.ver;
  if (!readOnly) commitBlock(S, b, today());
  const ix = index(S);
  if (e.relatedTarget && row.contains(e.relatedTarget)) { row.classList.remove('editing'); fillView(row.querySelector('.view'), b, ix); if (b.type === 'ord') row.querySelector('textarea').value = b.text; }
  else { row.replaceWith(drawRow(b, parent, ix)); markCur(); }
  if (v !== S.ver) touch(true);
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
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && e.shiftKey) { move(S, b.key, e.key === 'ArrowUp' ? -1 : 1); return done(b.key, pos); }
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
  if (p !== ta.selectionEnd || v.slice(p - 2, p) !== '[[' || v[p - 3] === '[' || v.slice(p, p + 2) === ']]') return;
  ta.value = v.slice(0, p) + ']]' + v.slice(p); ta.setSelectionRange(p, p);
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
  const m = b.type === 'ord' ? upto.match(/\[\[([^\[\]\n|]*)(?:\]\])?$/) : null;
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
    if (ctx && P[ctx]) items.push({ act: 'branch', ctx, title: `New branch of ${P[ctx].name}`, sub: q, create: true });
    items.push({ act: 'proj', title: 'New project', sub: q, create: true });
  }
  if (!items.length) return closeAc();
  ac = { key: b.key, start, items, sel: 0 };
  drawAc(ta);
}
function drawAc(ta) {
  const box = $('#ac'); box.textContent = '';
  ac.items.forEach((it, i) => {
    const btn = el('button', 'ac-item' + (i === ac.sel ? ' on' : '') + (it.create ? ' create' : ''));
    btn.append(el('span', 'ac-title', it.title), el('span', 'ac-sub', it.sub));
    btn.onmousedown = (e) => { e.preventDefault(); ac.sel = i; applyAc(ta); };
    box.appendChild(btn);
  });
  const r = ta.getBoundingClientRect();
  box.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 400)) + 'px';
  box.style.top = (r.bottom + 6) + 'px';
  box.hidden = false;
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
  if (FS.files.has(date) && !dirty.has(date) && await FS.changed(date)) { await reloadPage(date); toast('Loaded the newer version from disk'); }
  render(focusKey);
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
  readOnly = !await acquireWorkspaceLock();
  const t0 = performance.now();
  const pairs = await FS.loadAll(), t1 = performance.now(), back = [];
  $('#gate').hidden = true; $('#app').hidden = false;
  banner(readOnly ? 'This workspace is open in another tab. This tab is read-only.' : '');
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
}

async function boot() {
  $('#prev').onclick = () => go(shiftDay(cur, -1));
  $('#next').onclick = () => go(shiftDay(cur, 1));
  $('#today').onclick = () => go(today());
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
