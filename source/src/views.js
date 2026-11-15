// ---- 侧栏与只读视图：全部从内存索引现算，不保留任何派生状态 ----
const NAV = [['journal', 'Journal'], ['projects', 'Projects'], ['working', 'Working'], ['inbox', 'Inbox'], ['archive', 'Archive'], ['issues', 'Maintenance'], ['settings', 'Settings']];
const TITLES = { projects: 'Projects', working: 'Working', inbox: 'Inbox', archive: 'Archive', issues: 'Maintenance', settings: 'Settings' };
const moreOpen = new Set();
const icon = (ch) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">${ch}</text></svg>`;

function drawNav() {
  const st = stats(S, today()), counts = { working: st.open.length, issues: S.diags.length }, box = $('#nav-items');
  $('#nav').classList.toggle('narrow', cfg.nav === 'narrow');
  $('#nav-toggle').textContent = cfg.nav === 'narrow' ? '»' : '«';
  tip($('#nav-toggle'), cfg.nav === 'narrow' ? 'Expand sidebar' : 'Collapse sidebar', 'F');
  box.textContent = '';
  for (const [id, label] of NAV) {
    const b = el('button', 'nav-item' + (view === id || (id === 'projects' && view === 'project') ? ' on' : ''));
    b.innerHTML = icon(label[0]) + `<span class="nav-label">${label}</span>` + (counts[id] ? `<span class="count${id === 'issues' ? ' warn' : ''}">${counts[id]}</span>` : '');
    tip(b, label, `${NAV.findIndex((n) => n[0] === id) + 1} · Ctrl+Shift+${label[0]}`); b.onclick = () => show(id);
    box.appendChild(b);
  }
}

function show(v, arg) {
  if (v === 'journal') return go(cur);
  view = v; viewArg = arg; closeAc(); navIdx = null; navCur = null;
  $('#journal').hidden = true; $('#view').hidden = false;
  drawNav(); drawView();
  $('#view').scrollTop = 0;
}

// 点到标签去标签页，点到项目引用去项目页
function jump(e) {
  const t = e.target.closest('.person,.kind'), p = e.target.closest('[data-pj]');
  if (t) { show('tag', t.textContent.replace(/[{}]/g, '')); return true; }
  if (p && index(S).P[p.dataset.pj]) { show('project', p.dataset.pj); return true; }
  return false;
}
// 一条记录在列表里的样子；点击回到它所在的日期页
// 行尾的"打开"图标：记录上是回到 Journal，项目标题上是进入项目页；快捷键都是 O
function openBtn(label, fn, cls) {
  const j = tip(el('button', 'goto' + (cls ? ' ' + cls : '')), label, 'O');
  j.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5H3.5v9h9V10M9 3.5h3.5V7M12.5 3.5L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  j.onclick = (e) => { e.stopPropagation(); fn(); };
  return j;
}
function recLine(b, ix, o = {}) {
  const r = el('div', 'rec' + (b.del ? ' deleted' : '') + (o.stale ? ' stale' : ''));
  r.appendChild(el('span', 'rec-date', o.short ? b.date.slice(5) : b.date));
  if (b.status && !o.noStatus) r.appendChild(el('span', 'status ' + b.status, o.age != null ? `${b.status} · ${o.age}d` : b.status));
  const t = el('span', 'rec-text');
  t.innerHTML = b.type === 'ord' ? b.text.split('\n').map((l) => richLine(l, ix.P, ix.byId)).join('<br>') : `<strong>${esc(b.text)}</strong>`;
  r.appendChild(t);
  if (o.path && b.own && b.own !== 'INBOX' && ix.P[b.own]) {
    // 项目链只留首尾两级，中间用 … 代替；完整路径放在悬停提示里，点击进入该项目
    const full = projectPath(ix.P, b.own), parts = full.split(' / '), p = el('span', 'rec-path');
    // 空间不够时先压缩上级名称，最末一级（记录真正所在的项目）始终完整显示
    if (parts.length > 1) p.appendChild(el('span', 'up', parts[0] + (parts.length > 2 ? ' / …' : '')));
    p.appendChild(el('span', 'leaf', (parts.length > 1 ? ' / ' : '') + parts[parts.length - 1]));
    p.title = `Open project page · ${full}`; p.dataset.pj = b.own;
    r.appendChild(p);
  }
  if (o.action) { const x = el('button', 'mini', o.action[0]); x.onclick = (e) => { e.stopPropagation(); o.action[1](); }; r.appendChild(x); }
  const j = openBtn('Open in journal', () => go(b.page, b.key));
  r.appendChild(j);
  const editable = !readOnly && b.type === 'ord' && !b.del && !lockedBlock(b, stats(S, today()));
  if (editable) r.classList.add('editable');
  r.onclick = (e) => { if (r.classList.contains('editing') || jump(e)) return; if (editable) editRec(r, t, b, o); else go(b.page, b.key); };
  return r;
}
// 在列表里原地编辑：改的就是 Journal 里那条记录，保存到它所在的日期文件
function editRec(r, t, b, o) {
  const ta = el('textarea'), before = b.text, ver = S.ver;
  ta.value = b.text; ta.rows = 1; ta.spellcheck = false; ta.setAttribute('aria-label', 'Edit record');
  origin = { key: b.key, status: b.status, date: b.statusDate };
  navIdx = navItems().indexOf(r); setCur(r);
  r.classList.add('editing'); t.textContent = ''; t.appendChild(ta); grow(ta);
  ta.oninput = () => grow(ta);
  ta.onkeydown = (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {   // 和 Journal 一样循环切换状态
      e.preventDefault();
      if (!cycle(b)) return;
      const old = r.querySelector('.status'), chip = b.status ? el('span', 'status ' + b.status, b.status) : null;
      if (old && chip) old.replaceWith(chip); else if (old) old.remove(); else if (chip) r.insertBefore(chip, t);
    } else if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); ta.blur(); }
  };
  ta.onblur = () => {
    if (!r.isConnected) return;
    origin = null;
    if (!ta.value.trim()) { b.text = before; toast('Empty text ignored. Delete records in the journal.'); }
    else { b.text = ta.value; commitBlock(S, b, today()); }
    const opt = { ...o, noStatus: false, stale: false };
    if (o.age != null && b.statusDate) { opt.age = Math.max(0, daysBetween(b.statusDate, today())); opt.stale = (b.status === 'TODO' || b.status === 'WAIT') && opt.age >= cfg.stale; }
    const fresh = recLine(b, index(S), opt);
    if (r.classList.contains('cur')) fresh.classList.add('cur');
    r.replaceWith(fresh);
    if (ver !== S.ver) { touch(true, b.page); drawNav(); }
  };
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const byDateAsc = (a, b) => byDateDesc(b, a);
const byStart = (rev) => (a, b) => { const x = a.statusDate || a.date, y = b.statusDate || b.date; return x === y ? 0 : (x < y) !== rev ? -1 : 1; };
// 每个页面各自记住时间顺序；dflt 是该页默认是否"最近的在前"
const newest = (key, dflt) => (cfg[key] == null ? dflt : cfg[key] === 'new');
function sortBtn(key, dflt) {
  const on = newest(key, dflt), g = el('button', 'icon-btn sort' + (on ? '' : ' up'));
  g.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5v12M2.8 12.6l2.7 2.9 2.7-2.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 5h6.5M11 10h4.5M11 15h2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  tip(g, on ? 'Sorted newest first' : 'Sorted oldest first', 'S');
  g.onclick = () => { cfg[key] = on ? 'old' : 'new'; saveCfg(); drawView(); };
  return g;
}
const empty = (text) => el('p', 'empty', text);
function listInto(root, list, ix, o) {
  if (!list.length) return root.appendChild(empty('Nothing here.'));
  const max = 300;
  for (const b of list.slice(0, max)) root.appendChild(recLine(b, ix, o));
  if (list.length > max) root.appendChild(empty(`${list.length - max} more not shown.`));
}

// ---- 项目生命线（文字）----
function life(id) {
  const r = setLife(S, id, today());
  if (!r.ok) return toast(r.msg);
  touch(true, r.page); drawNav(); drawView();
}
function foldBtn(folded) {
  const f = el('button', 'fold' + (folded ? '' : ' open'));
  f.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  tip(f, folded ? 'Expand' : 'Collapse', 'Enter');
  return f;
}
const grpFold = new Set();
function pjHead(id, st, ix, folded, onFold, count) {
  const p = st.N[id], head = el('div', 'pj-head');
  if (onFold) {
    const f = foldBtn(folded);
    f.setAttribute('aria-expanded', String(!folded)); head.appendChild(f);
    head.classList.add('foldable');
    head.onclick = (e) => { if (e.target.closest('.fold') || !e.target.closest('button')) onFold(); };
  }
  const name = el('button', 'pj-name', p.name); name.onclick = () => show('project', id);
  head.appendChild(name);
  if (folded && count) head.appendChild(el('span', 'pj-count', `(${p.subEvents})`));
  const m = [`(${p.days}) days`]; if (p.subTodo) m.push(`(${p.subTodo}) todos`); if (p.subWait) m.push(`(${p.subWait}) waiting`);
  head.append(el('span', 'pj-meta', m.join(' · ')), el('span', 'cap ' + p.status, p.status), openBtn('Open project page', () => show('project', id), 'in'));
  const parentClosed = p.type === 'branch' && st.N[p.parent] && st.N[p.parent].closed;
  if (!readOnly && !parentClosed) { const a = el('button', 'mini act', p.life ? (p.type === 'proj' ? 'Restore' : 'Reopen') : (p.type === 'proj' ? 'Archive' : 'Complete')); a.onclick = () => life(id); head.append(el('span', 'grow'), a); }
  return head;
}
function drawProject(id, st, ix, top) {
  const p = st.N[id], folded = !!cfg.fold[id], node = el('div', 'pj' + (top ? ' top' : ''));
  node.appendChild(pjHead(id, st, ix, folded, () => { if (folded) delete cfg.fold[id]; else cfg.fold[id] = 1; saveCfg(); drawView(); }, true));
  if (folded) return node;
  const body = el('div', 'pj-body'), ev = p.events, cut = ev.length > 12 && !moreOpen.has(id) ? ev.length - 10 : 0, rev = newest('projOrder', false);
  const more = cut ? el('button', 'more', `(${cut}) earlier events`) : null;
  if (more) more.onclick = () => { moreOpen.add(id); drawView(); };
  // 默认从早到近；反过来时最近的在最上面，"更早的事件"收在最下面，分支也跟着倒序
  if (rev) { for (let i = ev.length - 1; i >= cut; i--) body.appendChild(recLine(ev[i], ix, { noStatus: true })); if (more) body.appendChild(more); }
  else { if (more) body.appendChild(more); for (let i = cut; i < ev.length; i++) body.appendChild(recLine(ev[i], ix, { noStatus: true })); }
  for (const k of rev ? p.kids.slice().reverse() : p.kids) body.appendChild(drawProject(k, st, ix, false));
  if (!body.childNodes.length) body.appendChild(el('span', 'empty', 'no events yet'));
  node.appendChild(body);
  return node;
}

// ---- 项目生命线（图形）：一条泳道一个分支，横轴是时间，圆点是有事件的日子 ----
function subtree(id, st, out = [], depth = 0) { out.push([id, depth]); if (depth < 30) for (const k of st.N[id].kids) subtree(k, st, out, depth + 1); return out; }
function drawGraph(id, st, W) {
  const t = today(), root = st.N[id], lanes = subtree(id, st), end = root.life || t, span = Math.max(1, daysBetween(root.date, end));
  const L = 220, R = 170, TOP = 26, H = 30, x0 = L, x1 = Math.max(L + 200, W - R), h = TOP + lanes.length * H + 8;
  const x = (d) => x0 + Math.min(1, Math.max(0, daysBetween(root.date, d) / span)) * (x1 - x0);
  const step = [1, 2, 7, 14, 30, 60, 90, 180, 365].find((s) => span / s <= 8) || 730, row = new Map();
  let g = '';
  for (let d = 0; d <= span; d += step) {
    const dt = new Date(Date.UTC(...root.date.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) + d * 86400000).toISOString().slice(0, 10), gx = x0 + (d / span) * (x1 - x0);
    if (x1 - gx < 46 && d) continue;
    g += `<line class="g-grid" x1="${gx}" y1="${TOP - 6}" x2="${gx}" y2="${h - 4}"/><text class="g-tick" x="${gx}" y="12" text-anchor="middle">${span > 300 ? dt.slice(2, 7) : dt.slice(5)}</text>`;
  }
  g += `<text class="g-tick" x="${x1}" y="12" text-anchor="middle">${root.life ? end.slice(5) : 'today'}</text>`;
  lanes.forEach(([pid, depth], i) => {
    const p = st.N[pid], y = TOP + i * H + H / 2, a = x(p.date), b = x(p.life || end), days = new Map();
    row.set(pid, y);
    if (i) g += `<path class="g-line" d="M${a} ${row.get(p.parent)}V${y}"/>`;
    g += `<line class="g-line${p.life ? ' done' : ''}" x1="${a}" y1="${y}" x2="${Math.max(b, a + 2)}" y2="${y}"/>`;
    if (p.life) g += `<rect class="g-end" x="${b - 1.5}" y="${y - 6}" width="3" height="12" rx="1"/>`;
    g += `<text class="g-name${i ? '' : ' main'}" data-pj="${pid}" x="${8 + depth * 14}" y="${y + 4}">${esc(p.name.length > 22 - depth * 2 ? p.name.slice(0, 21 - depth * 2) + '…' : p.name)}</text>`;
    const m = []; if (p.todo) m.push(`(${p.todo}) todos`); if (p.wait) m.push(`(${p.wait}) waiting`);
    g += `<text class="g-meta" x="${x1 + 14}" y="${y + 4}">${m.join(' · ')}</text>`;
    for (const e of p.events) { const l = days.get(e.date); if (l) l.push(e); else days.set(e.date, [e]); }
    for (const [d, l] of days) g += `<circle class="g-dot" data-date="${d}" data-key="${l[0].key}" cx="${x(d)}" cy="${y}" r="${l.length > 1 ? 5.5 : 4}"><title>${esc(d + '\n' + l.map((e) => e.text.split('\n')[0]).join('\n'))}</title></circle>`;
  });
  const box = el('div', 'graph');
  box.innerHTML = `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(root.name)} lifeline">${g}</svg>`;
  box.onclick = (e) => { const d = e.target.closest('.g-dot'); if (d) return go(d.dataset.date, d.dataset.key); jump(e); };
  return box;
}

// ---- 项目页 ----
function drawProjectPage(root, id, st, ix) {
  const p = st.N[id], t = today();
  if (!p) return root.appendChild(empty('This project no longer exists.'));
  const crumb = el('div', 'crumb'), chain = []; for (let c = p, n = 0; c && n < 20; c = c.type === 'branch' ? st.N[c.parent] : null, n++) chain.unshift(c);
  const all = el('button', 'link', 'Projects'); all.onclick = () => show('projects'); crumb.append(all);
  for (const c of chain.slice(0, -1)) { const b = el('button', 'link', c.name); b.onclick = () => show('project', c.id); crumb.append(el('span', null, ' / '), b); }
  root.appendChild(crumb);
  const head = pjHead(id, st, ix, false, null, false), decl = el('button', 'mini', 'Open in journal');
  head.classList.add('page'); head.querySelector('.goto').remove(); decl.onclick = () => go(p.date, ix.byId[id].key); head.append(decl, sortBtn('pageOrder', true));
  root.appendChild(head);
  root.appendChild(drawGraph(id, st, Math.max(640, root.clientWidth - 48)));
  const ids = subtree(id, st).map((x) => x[0]), recs = [];
  for (const k of ids) for (const b of ix.byProj.get(k) || []) if (!b.del) recs.push(b);
  const pageNew = newest('pageOrder', true), open = recs.filter((b) => b.status === 'TODO' || b.status === 'WAIT').sort(byStart(pageNew));
  root.appendChild(el('h2', null, `Open (${open.length})`));
  if (!open.length) root.appendChild(empty('Nothing open.'));
  for (const b of open) { const age = Math.max(0, daysBetween(b.statusDate || b.date, t)); root.appendChild(recLine(b, ix, { path: b.own !== id, age, stale: age >= cfg.stale, short: true })); }
  if (p.kids.length) { root.appendChild(el('h2', null, `Branches (${p.kids.length})`)); for (const k of p.kids) root.appendChild(pjHead(k, st, ix, false, null, false)); }
  root.appendChild(el('h2', null, `Records (${recs.length})`));
  if (!recs.length) return root.appendChild(empty('No records yet.'));
  recs.sort(pageNew ? byDateDesc : byDateAsc);
  let day = null;
  for (const b of recs.slice(0, 400)) { if (b.date !== day) root.appendChild(el('div', 'day', day = b.date)); const r = recLine(b, ix, { path: b.own !== id }); r.firstChild.remove(); root.appendChild(r); }
  if (recs.length > 400) root.appendChild(empty(`${recs.length - 400} ${pageNew ? 'older' : 'newer'} records not shown.`));
}

// ---- 按项目分栏：栏的顺序跟项目树一致（项目、子项目各一栏），栏内保持传入的顺序；Inbox 放最后 ----
function groupBtn(key) {
  const g = el('button', 'icon-btn grp');
  g.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3" width="5" height="3.4" rx="1" fill="currentColor"/><path d="M6 9h11M6 12.2h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/><rect x="2.5" y="14.6" width="5" height="3.4" rx="1" fill="currentColor"/><path d="M10 4.7h7M10 16.3h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  tip(g, 'Group by project', 'G'); g.setAttribute('aria-pressed', String(!!cfg[key]));
  g.onclick = () => { cfg[key] = !cfg[key]; saveCfg(); drawView(); };
  return g;
}
function drawGroups(root, list, st, ix, opt) {
  const groups = new Map(), order = [];
  for (const b of list) { const k = ix.P[b.own] ? b.own : 'INBOX'; let a = groups.get(k); if (!a) groups.set(k, a = []); a.push(b); }
  for (const t of st.tops) for (const [id] of subtree(t, st)) if (groups.has(id)) order.push(id);
  for (const k of groups.keys()) if (k !== 'INBOX' && !order.includes(k)) order.push(k);
  if (groups.has('INBOX')) order.push('INBOX');
  for (const k of order) {
    const fk = view + ':' + (viewArg || '') + ':' + k, folded = grpFold.has(fk), h = el('h3', 'group grp-head'), items = groups.get(k), f = foldBtn(folded);
    f.setAttribute('aria-expanded', String(!folded));
    h.appendChild(f);
    if (k === 'INBOX') h.appendChild(el('span', null, 'Inbox')); else { const b = el('button', 'pj-name', projectPath(ix.P, k)); b.onclick = () => show('project', k); h.appendChild(b); }
    h.appendChild(el('span', 'pj-meta', `(${items.length})`));
    if (k !== 'INBOX') h.appendChild(openBtn('Open project page', () => show('project', k), 'in'));
    h.onclick = (e) => { if (e.target.closest('.pj-name,.goto')) return; if (folded) grpFold.delete(fk); else grpFold.add(fk); drawView(); };
    root.appendChild(h);
    if (!folded) for (const b of items) root.appendChild(recLine(b, ix, opt(b)));
  }
}

// ---- 设置 ----
function seg(label, key, options) {
  const row = el('div', 'set-row'), g = el('div', 'seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
  row.appendChild(el('span', 'set-label', label));
  for (const [val, text] of options) { const b = el('button', null, text); b.setAttribute('aria-pressed', String(cfg[key] === val)); b.onclick = () => { cfg[key] = val; saveCfg(); drawView(); }; g.appendChild(b); }
  row.appendChild(g);
  return row;
}
function drawSettings(root) {
  root.appendChild(seg('Status label', 'chip', [['date', 'Date'], ['days', 'Days'], ['none', 'None']]));
  root.appendChild(seg('Theme', 'theme', [['system', 'System'], ...Object.entries(THEMES)]));
  root.appendChild(seg('Color style', 'color', [['full', 'Full'], ['soft', 'Soft'], ['mono', 'Mono']]));
  const row = el('div', 'set-row'), n = el('input'); n.type = 'number'; n.min = 1; n.max = 365; n.value = cfg.stale; n.id = 'stale';
  const lab = el('label', 'set-label', 'Stale after (days)'); lab.htmlFor = 'stale';
  n.onchange = () => { cfg.stale = Math.max(1, Math.min(365, parseInt(n.value, 10) || 7)); saveCfg(); };
  row.append(lab, n); root.appendChild(row);
  const ws = el('div', 'set-row'), ch = el('button', 'btn', 'Change folder');
  ch.onclick = () => openWorkspace(() => FS.pick());
  ws.append(el('span', 'set-label', 'Workspace'), el('span', 'chip', FS.where), ch); root.appendChild(ws);
  root.appendChild(el('h2', null, 'About'));
  for (const [k, val] of [['Version', APP_VERSION], ['Data format', 'worklog-schema ' + SCHEMA], ['Storage', 'Plain text files on this computer. Nothing is sent anywhere.'], ['License', 'MIT License. Free to use and modify, no warranty.']]) {
    const r = el('div', 'set-row'); r.append(el('span', 'set-label', k), el('span', 'set-val', val)); root.appendChild(r);
  }
}

function drawView() { drawViewBody(); markCur(); }
function drawViewBody() {
  if (view === 'journal') return;
  const root = $('#view'), ix = index(S), st = stats(S, today()), t = today();
  root.textContent = '';
  if (view === 'project') return drawProjectPage(root, viewArg, st, ix);
  const h1 = el('h1', null, view === 'tag' ? viewArg : view === 'search' ? `Search: ${viewArg}` : TITLES[view]);
  root.appendChild(h1);
  if (view === 'projects' || view === 'archive') {
    const ids = st.tops.filter((id) => !!st.N[id].life === (view === 'archive'));
    if (view === 'projects' && ids.length) {
      const g = el('div', 'seg small'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Lifeline style');
      for (const [val, text] of [['text', 'Text'], ['graph', 'Graph']]) { const b = el('button', null, text); b.setAttribute('aria-pressed', String(cfg.lifeline === val)); b.onclick = () => { cfg.lifeline = val; saveCfg(); drawView(); }; g.appendChild(b); }
      h1.appendChild(g);
      if (cfg.lifeline !== 'graph') h1.appendChild(sortBtn('projOrder', false));
      if (cfg.lifeline === 'graph') {
        const openId = cfg.graphOpen === '-' ? null : ids.includes(cfg.graphOpen) ? cfg.graphOpen : ids[0], W = Math.max(640, root.clientWidth - 48);
        for (const id of ids) {
          const node = el('div', 'pj top acc'), isOpen = id === openId;
          node.appendChild(pjHead(id, st, ix, !isOpen, () => { cfg.graphOpen = isOpen ? '-' : id; saveCfg(); drawView(); }, true));
          if (isOpen) node.appendChild(drawGraph(id, st, W));
          root.appendChild(node);
        }
        return;
      }
    }
    if (view === 'archive' && ids.length) h1.appendChild(sortBtn('projOrder', false));
    if (!ids.length) root.appendChild(empty(view === 'archive' ? 'No archived projects.' : 'No projects yet. Type [[ in the journal to create one.'));
    for (const id of ids) root.appendChild(drawProject(id, st, ix, true));
  } else if (view === 'working') {
    const cols = el('div', 'cols');
    h1.append(groupBtn('workGroup'), sortBtn('workOrder', false));
    for (const s of ['TODO', 'WAIT']) {
      const list = st.open.filter((b) => b.status === s).sort(byStart(newest('workOrder', false))), col = el('section', 'col');
      const opt = (b) => { const age = Math.max(0, daysBetween(b.statusDate || b.date, t)); return { path: !cfg.workGroup, age, stale: age >= cfg.stale, short: true }; };
      col.appendChild(el('h2', null, `${s} (${list.length})`));
      if (!list.length) col.appendChild(empty('Nothing here.'));
      else if (cfg.workGroup) drawGroups(col, list, st, ix, opt);
      else for (const b of list) col.appendChild(recLine(b, ix, opt(b)));
      cols.appendChild(col);
    }
    root.appendChild(cols);
  } else if (view === 'inbox') { h1.appendChild(sortBtn('inboxOrder', true)); listInto(root, st.inbox.slice().sort(newest('inboxOrder', true) ? byDateDesc : byDateAsc), ix, {}); }
  else if (view === 'tag') {
    const list = recordsByTag(S, viewArg).filter((b) => !b.del).sort(newest('tagOrder', true) ? byDateDesc : byDateAsc);
    h1.append(el('span', 'pj-count', `(${list.length})`), groupBtn('tagGroup'), sortBtn('tagOrder', true));
    if (!cfg.tagGroup || !list.length) return listInto(root, list, ix, { path: true });
    drawGroups(root, list, st, ix, () => ({}));
  }
  else if (view === 'search') {
    const q = viewArg.toLowerCase(), hits = [];
    eachBlock(S, (b) => { if (b.type !== 'raw' && b.type !== 'head' && !b.del && b.text.toLowerCase().includes(q)) hits.push(b); });
    listInto(root, hits.sort(byDateDesc), ix, { path: true });
  } else if (view === 'issues') {
    root.appendChild(el('h2', null, `Issues (${S.diags.length})`));
    if (!S.diags.length) root.appendChild(empty('No issues.'));
    for (const d of S.diags) {
      const b = el('button', 'issue ' + d.level);
      b.append(el('span', 'lvl', d.level === 'warn' ? 'warn' : d.level === 'block' ? 'block' : 'error'), el('span', 'rec-date', d.date), el('span', null, d.msg + (d.line ? ` (line ${d.line})` : '')));
      b.onclick = () => go(d.date, d.key); root.appendChild(b);
    }
    const dels = []; eachBlock(S, (b) => { if (b.del) dels.push(b); });
    root.appendChild(el('h2', null, `Deleted records (${dels.length})`));
    if (!dels.length) root.appendChild(empty('None.'));
    for (const b of dels) root.appendChild(recLine(b, ix, { path: true, action: readOnly ? null : ['Restore', () => { b.del = null; bump(S); touch(true, b.page); drawView(); }] }));
    root.appendChild(el('h2', null, 'Workspace'));
    const row = el('div', 'set-row'), re = el('button', 'btn', 'Rescan workspace');
    re.onclick = () => openWorkspace(() => true, () => { show('issues'); toast('Workspace rescanned'); });
    row.append(el('span', 'chip', loadInfo), re); root.appendChild(row);
  } else if (view === 'settings') drawSettings(root);
}

// ---- 页面级键盘导航 ----
// 焦点可以停在记录和项目标题上；Journal 里每个块都是一站
const HEADS = '#view .pj-head, #view .grp-head';
function navItems() { return [...document.querySelectorAll(view === 'journal' ? '#editor .row' : '#view .rec, ' + HEADS)]; }
function setCur(node) {
  for (const x of document.querySelectorAll('.cur')) x.classList.remove('cur');
  if (node) { node.classList.add('cur'); node.scrollIntoView({ block: 'nearest' }); }
}
function markCur() {   // 重画之后把焦点标回去
  const n = view === 'journal' ? navCur && document.querySelector(`#editor .block[data-key="${navCur}"] > .row`) : navIdx != null && navItems()[navIdx];
  if (n) n.classList.add('cur');
}
const KEYS = [
  ['Move', [['J  ↓', 'Next item'], ['K  ↑', 'Previous item'], ['Shift+J  Ctrl+J', 'Next project heading'], ['Shift+K  Ctrl+K', 'Previous project heading']]],
  ['Act', [['Enter', 'Edit record · fold or unfold heading'], ['Esc', 'Leave editing · clear focus'], ['O', 'Open record in journal · open project page'], ['G', 'Group by project (Working, tags)'], ['S', 'Reverse time order'], ['F', 'Collapse or expand sidebar'], ['/', 'Search'], ['?', 'This help']]],
  ['Go to', NAV.map(([, label], i) => [`${i + 1}  Ctrl+Shift+${label[0]}`, label])],
  ['While editing', [['Ctrl/Cmd+Enter', 'Cycle none → TODO → WAIT → DONE'], ['Shift+Enter', 'Continuation line'], ['Tab  Shift+Tab', 'Indent · outdent (journal)'], ['Alt+Shift+↑↓', 'Move block (journal)'], ['[[', 'Project menu (journal)']]]
];
function toggleHelp() {
  const d = $('#help');
  if (d.open) return d.close();
  d.textContent = '';
  const x = el('button', 'mini', 'Esc'); x.onclick = () => d.close();
  const top = el('div', 'help-top'); top.append(el('strong', null, 'Keyboard shortcuts'), x); d.appendChild(top);
  const grid = el('div', 'help-grid');
  for (const [title, rows] of KEYS) {
    const sec = el('section'); sec.appendChild(el('h2', null, title));
    for (const [k, what] of rows) { const r = el('div', 'help-row'); r.append(el('kbd', null, k), el('span', null, what)); sec.appendChild(r); }
    grid.appendChild(sec);
  }
  d.appendChild(grid);
  d.showModal();
}
function navKey(e) {
  if (openingWorkspace || $('#app').hidden || e.metaKey || e.altKey || e.isComposing) return;
  const L = e.code && e.code.startsWith('Key') ? e.code[3] : (e.key || '').length === 1 ? e.key.toUpperCase() : '';
  // 侧栏跳转：Ctrl+Shift+首字母，在任何地方都有效（包括编辑中）
  if (e.ctrlKey && e.shiftKey) {
    const hit = L && NAV.find(([, label]) => label[0] === L);
    if (!hit) return;
    e.preventDefault(); e.stopPropagation();
    if ($('#help').open) $('#help').close();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    return void show(hit[0]);
  }
  const a = document.activeElement, tag = a && a.tagName, from = e.target && e.target.tagName;
  if ([tag, from].some((x) => x === 'TEXTAREA' || x === 'INPUT' || x === 'SELECT')) return;   // 编辑框里按的键不归这里管
  if ($('#help').open) { if (e.key === '?') { e.preventDefault(); toggleHelp(); } return; }
  if (e.key === '?') { e.preventDefault(); return toggleHelp(); }
  if (e.key === '/' && !e.ctrlKey) {   // 搜索框；侧栏折叠着就先展开
    e.preventDefault();
    if (cfg.nav === 'narrow') { cfg.nav = 'wide'; saveCfg(); drawNav(); }
    $('#q').focus(); $('#q').select(); return;
  }
  const down = L === 'J' || e.key === 'ArrowDown', up = L === 'K' || e.key === 'ArrowUp';
  const items = navItems(), i = items.findIndex((x) => x.classList.contains('cur')), cur = items[i];
  const move = (n) => {
    e.preventDefault();
    if (a && a.blur && a !== document.body) a.blur();   // 否则回车会触发刚才点过的按钮
    if (n < 0 || n >= items.length) return;
    navIdx = n; if (view === 'journal') navCur = items[n].parentNode.dataset.key;
    setCur(items[n]);
  };
  if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); return void show(NAV[e.key - 1][0]); }   // 数字键：侧栏第几项
  if (e.ctrlKey || e.shiftKey && (L === 'J' || L === 'K')) {   // Ctrl+J/K 或 Shift+J/K：跳到下一个、上一个项目标题
    if (!down && !up || e.key.startsWith('Arrow')) return;
    const isHead = (x) => (view === 'journal' ? x.classList.contains('decl') : !x.classList.contains('rec'));
    let n = i;
    do { n += down ? 1 : -1; } while (n >= 0 && n < items.length && !isHead(items[n]));
    return move(n);
  }
  if (down || up) { if (items.length) move(i < 0 ? 0 : Math.max(0, Math.min(items.length - 1, i + (down ? 1 : -1)))); return; }
  if (L === 'F' && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); return void $('#nav-toggle').click(); }
  if (L === 'S' && view !== 'journal') { const g = $('#view .icon-btn.sort'); if (g) { e.preventDefault(); g.click(); } return; }
  if (L === 'G' && view !== 'journal') { const g = $('#view .icon-btn.grp'); if (g) { e.preventDefault(); g.click(); } return; }
  if (e.key === 'Escape') { if (cur) { navIdx = null; navCur = null; setCur(null); } return; }
  if (!cur || tag === 'BUTTON' && e.key === 'Enter') return;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (view === 'journal') focusBlock(cur.parentNode.dataset.key);
    else if (cur.classList.contains('rec')) { if (cur.classList.contains('editable')) cur.click(); }
    else if (cur.classList.contains('foldable') || cur.classList.contains('grp-head')) cur.click();
  } else if (L === 'O' && view !== 'journal') {
    e.preventDefault();
    const b = cur.querySelector('.goto') || cur.querySelector('.pj-name');
    if (b) b.click();
  }
}
window.addEventListener('keydown', navKey, true);
